// ============================================
// EMAIL SERVICE
// En développement : affiche dans la console
// En production : utilise Nodemailer (à configurer)
// ============================================

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(email, resetToken, userName) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  // En développement, on log dans la console
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL DE RÉINITIALISATION (Mode Développement)');
    console.log('='.repeat(60));
    console.log(`À: ${email}`);
    console.log(`Nom: ${userName || 'Utilisateur'}`);
    console.log(`Sujet: Réinitialisation de votre mot de passe - Copro Manager`);
    console.log('-'.repeat(60));
    console.log('Contenu:');
    console.log(`Bonjour ${userName || ''},`);
    console.log('');
    console.log('Vous avez demandé la réinitialisation de votre mot de passe.');
    console.log('Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :');
    console.log('');
    console.log(`🔗 ${resetUrl}`);
    console.log('');
    console.log('Ce lien expirera dans 1 heure.');
    console.log('='.repeat(60) + '\n');
    
    return { 
      success: true, 
      messageId: 'dev-' + Date.now(),
      previewUrl: resetUrl
    };
  }

  // En production, utiliser Nodemailer
  // TODO: Configurer nodemailer avec les variables d'environnement
  try {
    // const nodemailer = await import('nodemailer');
    // ... configuration SMTP production
    console.log(`📧 Would send password reset email to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Envoyer un email de confirmation après changement de mot de passe
 */
export async function sendPasswordChangedEmail(email, userName) {
  // En développement, on log dans la console
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL DE CONFIRMATION (Mode Développement)');
    console.log('='.repeat(60));
    console.log(`À: ${email}`);
    console.log(`Sujet: Votre mot de passe a été modifié`);
    console.log('-'.repeat(60));
    console.log(`Bonjour ${userName || ''},`);
    console.log('Votre mot de passe Copro Manager a été modifié avec succès.');
    console.log('='.repeat(60) + '\n');
    
    return { success: true };
  }

  // En production
  console.log(`📧 Would send password changed confirmation to ${email}`);
  return { success: true };
}

export default { sendPasswordResetEmail, sendPasswordChangedEmail };
