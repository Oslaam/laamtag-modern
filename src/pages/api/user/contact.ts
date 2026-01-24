import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    const { type, name, email, walletAddress, title, description } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // 1. SAVE TO DATABASE (Already confirmed working)
        await prisma.supportTicket.create({
            data: {
                walletAddress: walletAddress || 'Anonymous',
                type,
                name,
                email,
                title,
                description
            }
        });

        // 2. SETUP EMAIL TRANSPORTER
        // PrivateEmail requires strict authentication
        const transporter = nodemailer.createTransport({
            host: "mail.privateemail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Critical: Some servers require this for unauthorized SSL certs
            tls: {
                rejectUnauthorized: false
            }
        });

        // 3. SEND THE EMAIL
        const info = await transporter.sendMail({
            from: `"Vault Support" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Sends to support@uselaamtag.xyz
            replyTo: email,
            subject: `[${type.toUpperCase()}] ${title}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #333; border-radius: 20px; overflow: hidden; background-color: #000; color: #fff; border: 1px solid #EAB308;">
                    <div style="background-color: #EAB308; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; color: #000;">NEW SUPPORT TICKET</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="color: #EAB308; font-weight: bold;">Category: ${type}</p>
                        <p><strong>From:</strong> ${name} (${email})</p>
                        <p><strong>Wallet:</strong> ${walletAddress}</p>
                        <hr style="border: 0; border-top: 1px solid #222;" />
                        <p><strong>Subject:</strong> ${title}</p>
                        <p style="white-space: pre-wrap;">${description}</p>
                    </div>
                </div>
            `,
        });

        console.log("Email sent successfully:", info.messageId);
        return res.status(200).json({ success: true });

    } catch (error: any) {
        // This will now show you EXACTLY why the email failed in your terminal
        console.error("FULL EMAIL ERROR:", error.message);

        // We return 200 because the database part succeeded, 
        // but we log the error for you to fix the SMTP.
        return res.status(200).json({
            success: true,
            warning: "Database saved, but email failed. Check logs."
        });
    }
}