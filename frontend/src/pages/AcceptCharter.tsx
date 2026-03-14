import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Shield, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function AcceptCharter() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!token || !savedUser) {
      navigate('/login', { replace: true });
      return;
    }
    // Si la charte est déjà acceptée, rediriger vers le dashboard
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
      toast.error(error.response?.data?.error || 'Erreur lors de l\'acceptation');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-8 sm:pt-16 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl mb-1">Charte d'Utilisation et Decharge de Responsabilite</CardTitle>
          <p className="text-sm text-muted-foreground">
            Veuillez lire attentivement et accepter cette charte pour continuer
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Zone scrollable avec la charte */}
          <div
            onScroll={handleScroll}
            className="h-80 overflow-y-auto border rounded-lg p-5 bg-muted/30 text-sm leading-relaxed space-y-4 scroll-smooth"
          >
            <h3 className="font-bold text-base">1. Objet de la Plateforme</h3>
            <p>
              Le site Fuelers Retour est un outil de mise en relation entre etudiants de notre ecole
              pour faciliter le partage de trajets en VTC (Uber, Bolt, Heetch etc.). La plateforme se
              limite exclusivement a l'organisation logistique (algorithme de rencontre) et ne fournit
              aucun service de transport.
            </p>

            <h3 className="font-bold text-base">2. Statut de l'Editeur</h3>
            <p>
              L'administrateur du site agit en tant que simple intermediaire technique. Il n'est en
              aucun cas responsable de la conduite des chauffeurs tiers, du comportement des passagers
              ou du bon deroulement du trajet une fois la mise en relation effectuee.
            </p>

            <h3 className="font-bold text-base">3. Limitation de Responsabilite</h3>
            <p>En acceptant cette charte, l'utilisateur reconnait et accepte que :</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Securite physique :</strong> L'editeur ne peut etre tenu responsable des
                incidents, accidents, agressions, vols ou tout autre prejudice survenant lors d'un
                trajet partage.
              </li>
              <li>
                <strong>Choix des partenaires :</strong> L'utilisateur est seul responsable de decider
                s'il souhaite monter dans un vehicule avec les personnes suggerees par l'algorithme.
              </li>
              <li>
                <strong>Transactions financieres :</strong> L'editeur n'intervient pas dans le
                paiement du trajet (qui se fait via l'application de transport tierce ou entre les
                passagers). Tout litige financier concerne uniquement les utilisateurs entre eux.
              </li>
            </ul>

            <h3 className="font-bold text-base">4. Obligations de l'Utilisateur</h3>
            <p>
              Pour garantir le bon fonctionnement et la securite de la communaute, l'utilisateur
              s'engage a :
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fournir des informations exactes lors de l'inscription.</li>
              <li>
                Se comporter de maniere respectueuse et cordiale avec les autres etudiants et le
                chauffeur.
              </li>
              <li>
                Respecter les regles de securite elementaires (verification de la plaque
                d'immatriculation du VTC, partage de position avec des proches, etc.).
              </li>
            </ul>

            <h3 className="font-bold text-base">5. Protection des Donnees</h3>
            <p>
              Les donnees collectees (nom, trajet, horaires) ne sont utilisees que pour le
              fonctionnement de l'algorithme et ne seront jamais revendues a des tiers.
            </p>

            <h3 className="font-bold text-base">6. Acceptation des Risques</h3>
            <p>
              L'utilisation de la plateforme se fait aux risques et perils de l'utilisateur. En
              cochant la case "J'accepte les conditions d'utilisation", l'utilisateur decharge
              expressement l'editeur de toute poursuite judiciaire liee a l'utilisation du service.
            </p>
          </div>

          {/* Indicateur de scroll si pas encore en bas */}
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              Faites defiler vers le bas pour lire l'integralite de la charte
            </p>
          )}

          {/* Checkbox d'acceptation */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 cursor-pointer"
            />
            <span className={`text-sm ${!hasScrolledToBottom ? 'text-muted-foreground' : ''}`}>
              J'ai lu et j'accepte la <strong>Charte d'Utilisation et Decharge de Responsabilite</strong>.
              Je reconnais que l'utilisation de Fuelers se fait a mes propres risques et perils.
            </span>
          </label>

          {/* Bouton de validation */}
          <Button
            onClick={handleAccept}
            disabled={loading || !accepted}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Accepter et continuer
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
