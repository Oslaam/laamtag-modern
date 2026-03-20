import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    const { type, name, email, walletAddress, title, description, ticketId } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Save ticket first — always recorded even if email fails
    try {
        await prisma.supportTicket.create({
            data: {
                id: ticketId,
                walletAddress: walletAddress || 'Anonymous',
                type: type || 'Complaint',
                name,
                email,
                title,
                description,
                status: "Pending"
            }
        });
    } catch (dbError: any) {
        console.error("DB ERROR:", dbError);
        return res.status(500).json({ error: "Failed to save ticket" });
    }

    // Send emails — failure here doesn't break the ticket save
    try {
        const transporter = nodemailer.createTransport({
            host: "mail.privateemail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }
        });
        // No verify() — causes timeouts for non-admin connections

        const adminMail = {
            from: `"${name} via Vault" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `[${type.toUpperCase()}] REF: ${ticketId}`,
            html: `
                <div style="font-family: monospace; max-width: 600px; margin: auto; background-color: #000; color: #fff; border: 1px solid #EAB308; padding: 20px;">
                    <h2 style="color: #EAB308; border-bottom: 1px solid #EAB308; padding-bottom: 10px;">NEW TRANSMISSION: ${ticketId}</h2>
                    <p><strong>Category:</strong> ${type}</p>
                    <p><strong>Operator:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Wallet:</strong> ${walletAddress}</p>
                    <div style="background: #111; padding: 15px; border-left: 3px solid #EAB308; margin-top: 20px;">
                        <p><strong>Subject:</strong> ${title}</p>
                        <p style="white-space: pre-wrap;">${description}</p>
                    </div>
                </div>
            `,
        };

        const userMail = {
            from: `"Laamtag Vault" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Transmission Logged: ${ticketId}`,
            html: `
                <div style="font-family: monospace; background-color: #000; color: #fff; padding: 20px; border: 1px solid #333;">
                    <h2 style="color: #EAB308;">TRANSMISSION RECEIVED</h2>
                    <p>Greetings Operator ${name},</p>
                    <p>Your transmission has been logged into the Vault databanks.</p>
                    <div style="margin: 20px 0; padding: 10px; border: 1px dashed #EAB308; display: inline-block;">
                        <span style="color: #888; font-size: 10px;">REFERENCE ID:</span><br/>
                        <strong style="font-size: 18px; color: #EAB308;">${ticketId}</strong>
                    </div>
                    <p>Our agents will review the logs shortly.</p>
                </div>
            `
        };

        // Send independently — one failing won't kill the other
        await transporter.sendMail(adminMail).catch(e => console.error("ADMIN MAIL ERROR:", e.message));
        await transporter.sendMail(userMail).catch(e => console.error("USER MAIL ERROR:", e.message));

    } catch (mailError: any) {
        console.error("MAILER ERROR:", mailError.message);
    }

    return res.status(200).json({ success: true, ticketId });
}