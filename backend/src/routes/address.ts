import { Router } from 'express';

const router = Router();

// Proxy pour l'API d'adresse du gouvernement français
router.get('/validate', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Paramètre de recherche requis' });
    }

    // Appeler l'API gouvernementale depuis le backend
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la validation de l\'adresse');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur validation adresse:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de l\'adresse' });
  }
});

export default router;
