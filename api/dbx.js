// api/dbx.js — Fonction serveur Vercel
// Garde le SECRET Dropbox (refresh token) côté serveur, hors de portée du navigateur.
// Le front appelle /api/dbx pour obtenir un access_token TEMPORAIRE (valable ~4h),
// exactement comme dbxToken() le faisait, mais sans jamais exposer le secret permanent.
//
// ── À CONFIGURER UNE SEULE FOIS sur Vercel ──
// Project → Settings → Environment Variables, ajoute ces 3 variables :
//   DBX_APP_KEY      = 6kd1aik85onauhp
//   DBX_APP_SECRET   = (le secret de l'app Dropbox)
//   DBX_REFRESH      = (le refresh token)
// Puis redeploie. NE mets PLUS ces valeurs dans index.html.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const APP_KEY = process.env.DBX_APP_KEY;
  const APP_SECRET = process.env.DBX_APP_SECRET;
  const REFRESH = process.env.DBX_REFRESH;
  if (!APP_KEY || !APP_SECRET || !REFRESH) {
    res.status(500).json({ error: 'Variables Dropbox manquantes côté serveur (DBX_APP_KEY / DBX_APP_SECRET / DBX_REFRESH).' });
    return;
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH,
      client_id: APP_KEY,
      client_secret: APP_SECRET
    });
    const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', body });
    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: 'Auth Dropbox échouée (' + r.status + ')', detail });
      return;
    }
    const j = await r.json();
    // On ne renvoie QUE l'access_token temporaire + sa durée de vie. Jamais le secret.
    res.status(200).json({ access_token: j.access_token, expires_in: j.expires_in || 14400 });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Erreur serveur Dropbox' });
  }
}
