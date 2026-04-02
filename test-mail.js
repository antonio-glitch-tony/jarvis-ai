require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('📧 Test invio email...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Impostata (lunghezza: ' + process.env.EMAIL_PASS.length + ' caratteri)' : '❌ Non impostata');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    
    try {
        let info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: '✅ B.A.R.R.Y. - Test Connessione Email',
            html: '<h1>Test riuscito!</h1><p>La configurazione email di B.A.R.R.Y. funziona correttamente.</p><p>Ora puoi registrarti!</p>'
        });
        console.log('✅ Email inviata con successo!');
        console.log('ID:', info.messageId);
    } catch (err) {
        console.error('❌ Errore:', err.message);
    }
}

testEmail();