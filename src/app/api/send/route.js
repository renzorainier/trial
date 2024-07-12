import  {NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';
import { EmailTemplate } from '../../components/InEmail';
import { Resend } from 'resend';

// const resend = new Resend('re_htq8jLQk_6U5YB23eQekWvoNBzPYv2n4f');
// const resend = new Resend('re_htq8jLQk_6U5YB23eQekWvoNBzPYv2n4f');

export  async function POST(request) {

    try {
        const body = await request.json();
        console.log("body", body)
        const {email, studentName, message, subject, token, title } = body;
        const resend = new Resend(token);
        const data = await resend.emails.send({
            from: 'MVBA <metroviewbaptistacademy@resend.dev>',
            to: email,
            subject: subject,
            react: EmailTemplate({title: title,  studentName: studentName, message: message}),
          });

          if(data.status === 'success') {
            return NextResponse.json({message: 'Email Succesfuly Sent!'})
        }
        return NextResponse.json(data)

    } catch (error) {
        console.log('error', error)
    }
};
