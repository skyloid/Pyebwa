const express = require('express');
const crypto = require('crypto');
const { Webhook } = require('standardwebhooks');
const router = express.Router();
const userQueries = require('../db/queries/users');
const { verifySession, isAdmin, normalizeRole, normalizeDisplayName } = require('../db/auth');
const { supabaseAdmin } = require('../services/supabase');
const {
    getAuthExternalUrl,
    getSiteUrl,
    getSupabaseAuthAdminUrl,
    getSupabaseAuthJwtSecret
} = require('../services/pyebwa-supabase-config');
const { logSecurityEvent, logUnauthorizedAccess, SecurityEvents } = require('../services/security-logger');

const SUPPORTED_LANGUAGES = new Set(['en', 'fr', 'ht']);
const AUTH_EMAIL_SUBJECTS = {
    en: {
        signup: 'Confirm Your Email',
        magiclink: 'Your Magic Link',
        recovery: 'Reset Your Password',
        invite: 'You Have Been Invited',
        email_change: 'Confirm Email Change',
        reauthentication: 'Confirm Reauthentication'
    },
    fr: {
        signup: 'Confirmez votre adresse e-mail',
        magiclink: 'Votre lien magique',
        recovery: 'Réinitialisez votre mot de passe',
        invite: 'Vous avez été invite',
        email_change: "Confirmez le changement d'adresse e-mail",
        reauthentication: 'Confirmez la reauthentification'
    },
    ht: {
        signup: 'Konfime adrès imel ou',
        magiclink: 'Lyen koneksyon ou',
        recovery: 'Reyinisyalize modpas ou',
        invite: 'Ou resevwa yon envitasyon',
        email_change: 'Konfime chanjman imel la',
        reauthentication: 'Konfime rekoneksyon an'
    }
};

const AUTH_EMAIL_COPY = {
    en: {
        brandTagline: 'Your Family Tree',
        buttonLabel: 'Open Pyebwa',
        fallbackLabel: 'If the button does not work, copy and paste this link into your browser:',
        footer: 'This link will return you to Pyebwa automatically after verification.',
        generic: {
            heading: 'Complete your request',
            intro: 'Use the button below to continue securely on Pyebwa.'
        },
        signup: {
            heading: 'Confirm your email address',
            intro: 'Use the button below to confirm your email and finish creating your Pyebwa account.'
        },
        magiclink: {
            heading: 'Sign in to your account',
            intro: 'Use the button below to sign in securely. This link is unique to you and can only be used for this login.'
        },
        recovery: {
            heading: 'Reset your password',
            intro: 'Use the button below to securely reset your password.'
        },
        invite: {
            heading: 'You have been invited',
            intro: 'Use the button below to accept your invitation and continue on Pyebwa.'
        },
        email_change: {
            heading: 'Confirm your email change',
            intro: 'Use the button below to confirm this email address change securely.'
        },
        reauthentication: {
            heading: 'Confirm this action',
            intro: 'Use the button below to complete this secure verification step.'
        },
        otpLabel: 'Verification code'
    },
    fr: {
        brandTagline: 'Votre arbre genealogique',
        buttonLabel: 'Ouvrir Pyebwa',
        fallbackLabel: 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
        footer: 'Ce lien vous ramenera automatiquement vers Pyebwa apres verification.',
        generic: {
            heading: 'Terminez votre demande',
            intro: 'Utilisez le bouton ci-dessous pour continuer en toute securite sur Pyebwa.'
        },
        signup: {
            heading: 'Confirmez votre adresse e-mail',
            intro: 'Utilisez le bouton ci-dessous pour confirmer votre adresse e-mail et terminer la creation de votre compte Pyebwa.'
        },
        magiclink: {
            heading: 'Connectez-vous a votre compte',
            intro: 'Utilisez le bouton ci-dessous pour vous connecter en toute securite. Ce lien est unique et reserve a cette connexion.'
        },
        recovery: {
            heading: 'Reinitialisez votre mot de passe',
            intro: 'Utilisez le bouton ci-dessous pour reinitialiser votre mot de passe en toute securite.'
        },
        invite: {
            heading: 'Vous avez ete invite',
            intro: 'Utilisez le bouton ci-dessous pour accepter votre invitation et continuer sur Pyebwa.'
        },
        email_change: {
            heading: "Confirmez le changement d'adresse e-mail",
            intro: "Utilisez le bouton ci-dessous pour confirmer ce changement d'adresse e-mail en toute securite."
        },
        reauthentication: {
            heading: 'Confirmez cette action',
            intro: 'Utilisez le bouton ci-dessous pour terminer cette etape de verification.'
        },
        otpLabel: 'Code de verification'
    },
    ht: {
        brandTagline: 'Pyebwa fanmi w',
        buttonLabel: 'Louvri Pyebwa',
        fallbackLabel: 'Si bouton an pa mache, kopye epi kole lyen sa a nan navigatè ou:',
        footer: 'Lyen sa a ap mennen ou tounen sou Pyebwa otomatikman apre verifikasyon.',
        generic: {
            heading: 'Fini demach ou an',
            intro: 'Sèvi ak bouton ki anba a pou kontinye an sekirite sou Pyebwa.'
        },
        signup: {
            heading: 'Konfime adrès imel ou',
            intro: 'Sèvi ak bouton ki anba a pou konfime imel ou epi fini kreye kont Pyebwa ou.'
        },
        magiclink: {
            heading: 'Konekte sou kont ou',
            intro: 'Sèvi ak bouton ki anba a pou konekte an sekirite. Lyen sa a fèt espesyalman pou ou epi li valab sèlman pou koneksyon sa a.'
        },
        recovery: {
            heading: 'Reyinisyalize modpas ou',
            intro: 'Sèvi ak bouton ki anba a pou reyinisyalize modpas ou an sekirite.'
        },
        invite: {
            heading: 'Ou resevwa yon envitasyon',
            intro: 'Sèvi ak bouton ki anba a pou aksepte envitasyon ou epi kontinye sou Pyebwa.'
        },
        email_change: {
            heading: 'Konfime chanjman imel la',
            intro: 'Sèvi ak bouton ki anba a pou konfime chanjman adrès imel sa a an sekirite.'
        },
        reauthentication: {
            heading: 'Konfime aksyon sa a',
            intro: 'Sèvi ak bouton ki anba a pou fini etap verifikasyon an sekirite sa a.'
        },
        otpLabel: 'Kòd verifikasyon'
    }
};

function normalizeLanguage(value) {
    const lang = String(value || '').trim().toLowerCase();
    return SUPPORTED_LANGUAGES.has(lang) ? lang : 'en';
}

function detectHookLanguage(user, emailData) {
    const metadataLang = normalizeLanguage(user?.user_metadata?.lang);
    if (metadataLang !== 'en' || String(user?.user_metadata?.lang || '').trim().toLowerCase() === 'en') {
        return metadataLang;
    }

    try {
        const redirectUrl = new URL(emailData?.redirect_to || '');
        const redirectLang = normalizeLanguage(redirectUrl.searchParams.get('lang'));
        if (redirectLang !== 'en' || String(redirectUrl.searchParams.get('lang') || '').trim().toLowerCase() === 'en') {
            return redirectLang;
        }
    } catch (error) {
        // Ignore invalid redirect URLs and fall through to English.
    }

    return 'en';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildConfirmationUrl(emailData) {
    if (emailData?.action_link) {
        return emailData.action_link;
    }

    const baseUrl = getAuthExternalUrl();
    const params = new URLSearchParams();

    if (emailData?.token_hash) {
        params.set('token_hash', emailData.token_hash);
    } else if (emailData?.token) {
        params.set('token', emailData.token);
    }

    params.set('type', emailData?.email_action_type || '');
    params.set('redirect_to', emailData?.redirect_to || 'https://rasin.pyebwa.com/login');

    return `${baseUrl}/auth/v1/verify?${params.toString()}`;
}

function createSupabaseAdminToken() {
    const secret = getSupabaseAuthJwtSecret();
    if (!secret) {
        throw new Error('SUPABASE_AUTH_JWT_SECRET is not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        role: 'service_role',
        iss: 'supabase',
        iat: now,
        exp: now + 31536000
    })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

async function generateMagicLinkEmail(email, redirectTo) {
    const authAdminUrl = getSupabaseAuthAdminUrl();
    const adminToken = createSupabaseAdminToken();
    const response = await fetch(`${authAdminUrl}/admin/generate_link`, {
        method: 'POST',
        headers: {
            apikey: adminToken,
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'magiclink',
            email,
            redirect_to: redirectTo
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.msg || payload?.message || `Magic link generation failed with ${response.status}`;
        throw new Error(message);
    }

    return payload;
}

function buildAuthEmailHtml(language, emailActionType, emailData) {
    const copy = AUTH_EMAIL_COPY[language] || AUTH_EMAIL_COPY.en;
    const section = copy[emailActionType] || copy.generic;
    const confirmationUrl = buildConfirmationUrl(emailData);
    const safeToken = escapeHtml(emailData?.token || '');
    const otpBlock = safeToken
        ? `<tr><td style="padding:0 32px 24px 32px;"><div style="border:1px dashed #b7c8bd;border-radius:16px;background:#f5f3ef;padding:16px 18px;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a675e;">${escapeHtml(copy.otpLabel)}</div><div style="margin-top:8px;font-size:28px;font-weight:800;letter-spacing:0.18em;color:#1B4332;">${safeToken}</div></div></td></tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml((AUTH_EMAIL_SUBJECTS[language] || AUTH_EMAIL_SUBJECTS.en)[emailActionType] || AUTH_EMAIL_SUBJECTS.en.magiclink)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Inter,Arial,sans-serif;color:#1b1b18;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fdfcfa;border:1px solid #dad7cd;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,#1B4332 0%,#2D6A4F 55%,#6B4F3A 100%);"></td>
          </tr>
          <tr>
            <td style="padding:36px 32px 18px 32px;text-align:center;">
              <div style="font-size:30px;font-weight:700;color:#1B4332;line-height:1.1;">Pyebwa</div>
              <div style="margin-top:8px;font-size:14px;color:#3A3832;">${escapeHtml(copy.brandTagline)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 10px 32px;">
              <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.3;color:#1b1b18;text-align:center;">${escapeHtml(section.heading)}</h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#3A3832;text-align:center;">${escapeHtml(section.intro)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 28px 32px;">
              <a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:#FDFCFA;text-decoration:none;font-size:16px;font-weight:700;">${escapeHtml(copy.buttonLabel)}</a>
            </td>
          </tr>
          ${otpBlock}
          <tr>
            <td style="padding:0 32px 18px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#3A3832;text-align:center;">${escapeHtml(copy.fallbackLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#2D6A4F;word-break:break-all;text-align:center;"><a href="${escapeHtml(confirmationUrl)}" style="color:#2D6A4F;text-decoration:underline;">${escapeHtml(confirmationUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 32px 32px;border-top:1px solid #ebe9e3;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6a675e;text-align:center;">${escapeHtml(copy.footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendAuthEmailThroughResend({ to, subject, html }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        throw new Error('RESEND_API_KEY is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.AUTH_EMAIL_FROM || 'Pyebwa <noreply@pyebwa.com>',
            to: [to],
            subject,
            html
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend send failed: ${response.status} ${errorText}`);
    }
}

// Signup — create user in Supabase Auth (triggers sync to public.users)
router.post('/signup', async (req, res) => {
    try {
        const { email, fullName } = req.body;

        if (!email || !fullName) {
            return res.status(400).json({ error: 'Email and full name are required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Generate a secure random password
        const tempPassword = crypto.randomBytes(12).toString('base64url');

        // Create user in Supabase Auth (on_auth_user_created trigger syncs to public.users).
        // Keep email unconfirmed and send a verification/magic link instead of exposing credentials.
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: false,
            user_metadata: {
                display_name: fullName,
                role: 'member'
            }
        });

        if (error) {
            console.error('Supabase signup error:', JSON.stringify(error), error.message, error.status);
            const errMsg = error.message || error.msg || JSON.stringify(error);
            if (errMsg.includes('already been registered') || errMsg.includes('already exists')) {
                return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
            }
            return res.status(400).json({ error: errMsg });
        }

        // Update public.users with display_name if trigger didn't set it
        try {
            const existingUser = await userQueries.findById(data.user.id);
            if (existingUser && !existingUser.display_name) {
                await userQueries.update(data.user.id, { display_name: fullName });
            } else if (!existingUser) {
                // Trigger may not have fired yet — insert manually as fallback
                await userQueries.create({
                    id: data.user.id,
                    email: email,
                    password_hash: 'supabase-managed',
                    display_name: fullName,
                    role: 'member'
                });
            }
        } catch (syncErr) {
            console.warn('User sync fallback:', syncErr.message);
        }

        // Send an auth link. Never log or email the generated bootstrap password.
        try {
            const redirectTo = `${getSiteUrl()}/login`;
            const magicLink = await generateMagicLinkEmail(email, redirectTo);
            const language = 'en';
            const actionType = String(magicLink?.verification_type || 'magiclink').trim().toLowerCase();
            const subject = (AUTH_EMAIL_SUBJECTS[language] || AUTH_EMAIL_SUBJECTS.en)[actionType] || AUTH_EMAIL_SUBJECTS.en.magiclink;
            const html = buildAuthEmailHtml(language, actionType, {
                action_link: magicLink?.action_link || '',
                token_hash: magicLink?.hashed_token || '',
                token: magicLink?.email_otp || '',
                email_action_type: actionType,
                redirect_to: magicLink?.redirect_to || redirectTo
            });

            await sendAuthEmailThroughResend({ to: email, subject, html });
        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr.message);
        }

        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            data.user.id,
            { action: 'user_signup', email, ip: req.ip },
            'info'
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Check your email for login credentials.',
            uid: data.user.id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
});

// Get current user info (JWT-based)
router.get('/me', verifySession, async (req, res) => {
    try {
        let user = null;
        try {
            user = await userQueries.findById(req.user.uid);
        } catch (lookupError) {
            console.warn('Get user info fallback:', lookupError.message);
        }

        if (!user) {
            return res.json({
                uid: req.user.uid,
                email: req.user.email,
                displayName: req.user.displayName || '',
                role: req.user.role || 'member',
                photoURL: null,
                emailVerified: true
            });
        }

        // Update last active timestamp
        try {
            await userQueries.update(user.id, { last_active: new Date() });
        } catch (updateError) {
            console.warn('Last active update skipped:', updateError.message);
        }

        res.json({
            uid: user.id,
            email: user.email,
            displayName: normalizeDisplayName(user, { user_metadata: user.raw_user_meta_data || {} }),
            role: normalizeRole(user, { user_metadata: user.raw_user_meta_data || {}, app_metadata: user.raw_app_meta_data || {} }),
            photoURL: user.photo_url,
            emailVerified: user.email_verified
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Update auth email language preference by email before sending OTP.
// Intentionally returns success even when no matching user exists to avoid account enumeration.
router.post('/email-language', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const lang = String(req.body?.lang || '').trim().toLowerCase();

        if (!email || !SUPPORTED_LANGUAGES.has(lang)) {
            return res.status(400).json({ error: 'Valid email and language are required' });
        }

        const user = await userQueries.findByEmail(email);
        if (!user?.id) {
            return res.json({ success: true });
        }

        const { data: authUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user.id);
        if (getUserError) {
            console.warn('Auth language lookup failed:', getUserError.message);
            return res.json({ success: true });
        }

        const existingMetadata = authUserData?.user?.user_metadata || {};
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...existingMetadata,
                lang
            }
        });

        if (updateError) {
            console.warn('Auth language update failed:', updateError.message);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Email language preference error:', error);
        res.json({ success: true });
    }
});

router.post('/magic-link', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const language = normalizeLanguage(req.body?.lang);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const redirectTo = `${getSiteUrl()}/login?lang=${encodeURIComponent(language)}`;
        const magicLink = await generateMagicLinkEmail(email, redirectTo);
        const actionType = String(magicLink?.verification_type || 'magiclink').trim().toLowerCase();
        const subject = (AUTH_EMAIL_SUBJECTS[language] || AUTH_EMAIL_SUBJECTS.en)[actionType] || AUTH_EMAIL_SUBJECTS.en.magiclink;
        const html = buildAuthEmailHtml(language, actionType, {
            action_link: magicLink?.action_link || '',
            token_hash: magicLink?.hashed_token || '',
            token: magicLink?.email_otp || '',
            email_action_type: actionType,
            redirect_to: magicLink?.redirect_to || redirectTo
        });

        await sendAuthEmailThroughResend({
            to: email,
            subject,
            html
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('Magic link email error:', error);
        return res.json({ success: true });
    }
});

router.post('/send-email-hook', async (req, res) => {
    try {
        const hookSecret = String(process.env.SEND_EMAIL_HOOK_SECRET || '').trim().replace(/^v1,whsec_/, '');
        if (!hookSecret) {
            return res.status(500).json({ error: 'Send email hook secret is not configured' });
        }

        const payload = req.rawBody || JSON.stringify(req.body || {});
        const webhook = new Webhook(hookSecret);
        const { user, email_data: emailData } = webhook.verify(payload, req.headers);

        const language = detectHookLanguage(user, emailData);
        const actionType = String(emailData?.email_action_type || '').trim().toLowerCase() || 'magiclink';
        const subject = (AUTH_EMAIL_SUBJECTS[language] || AUTH_EMAIL_SUBJECTS.en)[actionType] || AUTH_EMAIL_SUBJECTS.en.magiclink;
        const html = buildAuthEmailHtml(language, actionType, emailData);

        await sendAuthEmailThroughResend({
            to: user?.email,
            subject,
            html
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Send email hook error:', error);
        return res.status(401).json({
            error: {
                message: error.message
            }
        });
    }
});

// Update user profile
router.patch('/user/:uid', verifySession, async (req, res) => {
    try {
        const { uid } = req.params;
        const updateData = req.body;
        const currentUser = req.user;

        // Users can only update their own profile unless admin
        if (currentUser.uid !== uid && !(await isAdmin(currentUser.uid))) {
            await logUnauthorizedAccess(currentUser.uid, `user/${uid}`, req.ip);
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const allowedFields = ['display_name', 'photo_url'];
        const filteredData = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }

        if (Object.keys(filteredData).length > 0) {
            await userQueries.update(uid, filteredData);

            // Also update Supabase Auth user metadata
            const metaUpdate = {};
            if (filteredData.display_name) metaUpdate.display_name = filteredData.display_name;
            if (Object.keys(metaUpdate).length > 0) {
                await supabaseAdmin.auth.admin.updateUserById(uid, {
                    user_metadata: metaUpdate
                });
            }
        }

        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            currentUser.uid,
            { action: 'update_user', targetUid: uid, fields: Object.keys(filteredData) },
            'info'
        );

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Update user role (admin only)
router.post('/user/:uid/claims', verifySession, async (req, res) => {
    try {
        const { uid } = req.params;
        const { claims } = req.body;
        const currentUser = req.user;

        const currentUserRecord = await userQueries.findById(currentUser.uid);
        if (!currentUserRecord || currentUserRecord.role !== 'superadmin') {
            await logUnauthorizedAccess(currentUser.uid, `user/${uid}/claims`, req.ip);
            return res.status(403).json({ error: 'Superadmin access required' });
        }

        const allowedRoles = ['member', 'moderator', 'admin', 'superadmin'];
        if (claims.role && allowedRoles.includes(claims.role)) {
            // Update in public.users
            await userQueries.update(uid, { role: claims.role });

            // Update in Supabase Auth metadata
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                user_metadata: { role: claims.role }
            });
        }

        await logSecurityEvent(
            SecurityEvents.ADMIN_ACTION,
            currentUser.uid,
            { action: 'update_claims', targetUid: uid, claims, ip: req.ip },
            'warn'
        );

        res.json({ success: true, message: 'Role updated successfully.' });
    } catch (error) {
        console.error('Claims update error:', error);
        res.status(500).json({ error: 'Claims update failed' });
    }
});

// List all users (admin only)
router.get('/users', verifySession, async (req, res) => {
    try {
        if (!(await isAdmin(req.user.uid))) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await userQueries.findAll();
        res.json({ success: true, users });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

module.exports = router;
