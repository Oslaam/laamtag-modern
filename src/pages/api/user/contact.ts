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
        // 1. SAVE TO DATABASE
        await prisma.supportTicket.create({
            data: {
                walletAddress,
                type,
                name,
                email,
                title,
                description
            }
        });

        // 2. SETUP EMAIL TRANSPORTER
        const transporter = nodemailer.createTransport({
            host: "mail.privateemail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 3. SEND BEAUTIFIED EMAIL
        await transporter.sendMail({
            from: `"Vault Support" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `[${type.toUpperCase()}] ${title}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #333; border-radius: 20px; overflow: hidden; background-color: #000; color: #fff;">
                    <div style="background-color: #EAB308; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; color: #000; font-style: italic; letter-spacing: -1px;">NEW SUPPORT TICKET</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px;">Category</p>
                        <p style="font-size: 18px; margin-top: 0; color: #EAB308; font-weight: 900;">${type}</p>
                        
                        <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px;">User Identity</p>
                        <p style="margin-top: 0; font-size: 14px;"><strong>Name:</strong> ${name}</p>
                        <p style="margin-top: 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                        <p style="margin-top: 0; font-size: 14px;"><strong>Wallet:</strong> <code style="background: #111; padding: 4px 8px; border-radius: 5px; font-size: 12px; color: #EAB308;">${walletAddress}</code></p>
                        
                        <hr style="border: 0; border-top: 1px solid #222; margin: 20px 0;" />
                        
                        <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px;">Subject</p>
                        <p style="font-size: 16px; margin-top: 0; font-weight: bold; color: #fff;">${title}</p>
                        
                        <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px;">Details</p>
                        <p style="line-height: 1.6; color: #ccc; font-size: 15px;">${description}</p>
                    </div>
                    <div style="background-color: #0a0a0a; padding: 15px; text-align: center; font-size: 9px; color: #444; letter-spacing: 3px; font-weight: bold;">
                        LAAMTAG PROTOCOL • SECURE ENCRYPTED TERMINAL
                    </div>
                </div>
            `,
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Support Error:", error);
        return res.status(500).json({ error: "Action failed" });
    }
}