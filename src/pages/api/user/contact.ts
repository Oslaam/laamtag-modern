import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    // 1. Extract the custom ticketId from the frontend
    const { type, name, email, walletAddress, title, description, ticketId } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // 2. SAVE TO DATABASE using the frontend-generated ID
        const ticket = await prisma.supportTicket.create({
            data: {
                id: ticketId, // Store the TX-XXXX-2026 format as the ID
                walletAddress: walletAddress || 'Anonymous',
                type: type || 'Complaint',
                name,
                email,
                title,
                description,
                status: "Pending"
            }
        });

        // 3. SETUP THE TRANSPORTER
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

        await transporter.verify();

        // 4. ADMIN EMAIL - Includes the Reference ID
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

        // 5. USER EMAIL - Includes the Reference ID
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

        await Promise.all([
            transporter.sendMail(adminMail),
            transporter.sendMail(userMail)
        ]);

        return res.status(200).json({ success: true, ticketId: ticket.id });

    } catch (error: any) {
        console.error("MAILER ERROR:", error);
        return res.status(500).json({ error: "Transmission failed", details: error.message });
    }
}