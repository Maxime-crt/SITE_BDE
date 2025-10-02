import nodemailer from 'nodemailer';

// Créer un transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Générer un code de vérification à 6 chiffres
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Envoyer l'email de vérification
export async function sendVerificationEmail(email: string, firstName: string, code: string): Promise<void> {
  const mailOptions = {
    from: `"BDE IESEG" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Vérification de votre compte BDE IESEG',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            text-align: center;
            letter-spacing: 8px;
            padding: 20px;
            background: #f7f7f7;
            border-radius: 8px;
            margin: 20px 0;
          }
          .header {
            color: white;
            text-align: center;
            margin: 0;
          }
          .footer {
            text-align: center;
            color: #888;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">🎓 BDE IESEG</h1>
          <div class="content">
            <h2>Bonjour ${firstName} !</h2>
            <p>Merci de vous être inscrit sur la plateforme du BDE IESEG.</p>
            <p>Pour finaliser votre inscription, veuillez utiliser le code de vérification ci-dessous :</p>

            <div class="code">${code}</div>

            <p>Ce code est valable pendant <strong>15 minutes</strong>.</p>
            <p>Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.</p>

            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              <p>&copy; ${new Date().getFullYear()} BDE IESEG. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Bonjour ${firstName},

      Merci de vous être inscrit sur la plateforme du BDE IESEG.

      Votre code de vérification est : ${code}

      Ce code est valable pendant 15 minutes.

      Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.

      BDE IESEG
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de vérification envoyé à ${email}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw new Error('Impossible d\'envoyer l\'email de vérification');
  }
}
