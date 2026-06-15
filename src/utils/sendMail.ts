import nodemailer from 'nodemailer';

interface SendMailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

const sendMail = async (options: SendMailOptions) => {
    try {
        const transporter = nodemailer.createTransport({
            // Configure your transport options here, e.g., SMTP details from environment variables
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || '"ProcessX" <no-reply@processx.com>',
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });

        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export { sendMail };
