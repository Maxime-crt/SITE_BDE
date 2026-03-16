import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import logoFLR from '../assets/Logo_FLR.png';

export default function AcceptCharter() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!token || !savedUser) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const user = JSON.parse(savedUser);
      if (user.charterAcceptedAt) {
        navigate('/', { replace: true });
      }
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const [loading, setLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 30;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!accepted) {
      toast.error('Veuillez cocher la case pour accepter la charte');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.acceptCharter();
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('Charte acceptée ! Bienvenue sur Fuelers');
      window.location.href = '/';
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'acceptation");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col font-dm-sans">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto flex-1 pt-8 sm:pt-16 px-6 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-2">
            Charte d&apos;Utilisation et Décharge de Responsabilité
          </h1>
          <p className="text-white/40 text-sm">
            Veuillez lire attentivement et accepter cette charte pour continuer
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 space-y-5">
          {/* Zone scrollable */}
          <div
            onScroll={handleScroll}
            className="h-[28rem] overflow-y-auto rounded-xl bg-white/[0.03] border border-white/5 p-5 text-sm text-white/60 leading-relaxed space-y-4 custom-scrollbar"
          >
            <h3 className="font-syne font-bold text-white text-base">1. Objet de la Plateforme</h3>
            <p>
              Le site Fuelers Retour est un outil de mise en relation entre étudiants de notre école
              pour faciliter le partage de trajets en VTC (Uber, Bolt, Heetch etc.). La plateforme se
              limite exclusivement à l&apos;organisation logistique (algorithme de rencontre) et ne fournit
              aucun service de transport.
            </p>

            <h3 className="font-syne font-bold text-white text-base">2. Statut de l&apos;Éditeur</h3>
            <p>
              L&apos;administrateur du site agit en tant que simple intermédiaire technique. Il n&apos;est en
              aucun cas responsable de la conduite des chauffeurs tiers, du comportement des passagers
              ou du bon déroulement du trajet une fois la mise en relation effectuée.
            </p>

            <h3 className="font-syne font-bold text-white text-base">3. Limitation de Responsabilité</h3>
            <p>En acceptant cette charte, l&apos;utilisateur reconnaît et accepte que :</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white/80">Sécurité physique :</strong> L&apos;éditeur ne peut être tenu responsable des
                incidents, accidents, agressions, vols ou tout autre préjudice survenant lors d&apos;un
                trajet partagé.
              </li>
              <li>
                <strong className="text-white/80">Choix des partenaires :</strong> L&apos;utilisateur est seul responsable de décider
                s&apos;il souhaite monter dans un véhicule avec les personnes suggérées par l&apos;algorithme.
              </li>
              <li>
                <strong className="text-white/80">Transactions financières :</strong> L&apos;éditeur n&apos;intervient pas dans le
                paiement du trajet (qui se fait via l&apos;application de transport tierce ou entre les
                passagers). Tout litige financier concerne uniquement les utilisateurs entre eux.
              </li>
            </ul>

            <h3 className="font-syne font-bold text-white text-base">4. Obligations de l&apos;Utilisateur</h3>
            <p>
              Pour garantir le bon fonctionnement et la sécurité de la communauté, l&apos;utilisateur
              s&apos;engage à :
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fournir des informations exactes lors de l&apos;inscription.</li>
              <li>
                Se comporter de manière respectueuse et cordiale avec les autres étudiants et le
                chauffeur.
              </li>
              <li>
                Respecter les règles de sécurité élémentaires (vérification de la plaque
                d&apos;immatriculation du VTC, partage de position avec des proches, etc.).
              </li>
            </ul>

            <h3 className="font-syne font-bold text-white text-base">5. Protection des Données</h3>
            <p>
              Les données collectées (nom, trajet, horaires) ne sont utilisées que pour le
              fonctionnement de l&apos;algorithme et ne seront jamais revendues à des tiers.
            </p>

            <h3 className="font-syne font-bold text-white text-base">6. Acceptation des Risques</h3>
            <p>
              L&apos;utilisation de la plateforme se fait aux risques et périls de l&apos;utilisateur. En
              cochant la case « J&apos;accepte les conditions d&apos;utilisation », l&apos;utilisateur décharge
              expressément l&apos;éditeur de toute poursuite judiciaire liée à l&apos;utilisation du service.
            </p>
          </div>

          {/* Indicateur de scroll */}
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-white/30 animate-pulse">
              Faites défiler vers le bas pour lire l&apos;intégralité de la charte
            </p>
          )}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-400/20 transition-all">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 h-5 w-5 rounded accent-blue-500 disabled:opacity-30 cursor-pointer"
            />
            <span className={`text-sm ${!hasScrolledToBottom ? 'text-white/20' : 'text-white/60'}`}>
              J&apos;ai lu et j&apos;accepte la <strong className="text-white/80">Charte d&apos;Utilisation et Décharge de Responsabilité</strong>.
              Je reconnais que l&apos;utilisation de Fuelers se fait à mes propres risques et périls.
            </span>
          </label>

          {/* Bouton */}
          <button
            onClick={handleAccept}
            disabled={loading || !accepted}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-syne font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Accepter et continuer
              </>
            )}
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="relative w-full mt-16 py-16 px-6 border-t border-white/10 bg-gradient-to-b from-[#0a1128] to-[#0d1530]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10" />
              <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Fuelers
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-blue-400 transition-colors duration-300" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors duration-300" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            </div>
            <p className="text-white/60 text-sm font-medium">&copy; {new Date().getFullYear()} Fuelers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
