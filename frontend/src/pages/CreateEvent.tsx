import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { eventsApi } from '../services/api';
import toast from 'react-hot-toast';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    type: 'CB',
    customType: '',
    startDate: '',
    endDate: '',
    publishMode: 'now', // 'now' | 'schedule' | 'draft'
    publishedAt: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setLoading(true);
    try {
      // Calculer la date de publication
      let publishedAt: string | undefined;
      if (formData.publishMode === 'now') {
        publishedAt = new Date().toISOString();
      } else if (formData.publishMode === 'schedule') {
        publishedAt = new Date(formData.publishedAt).toISOString();
      }
      // Si publishMode === 'draft', publishedAt reste undefined (brouillon)

      await eventsApi.create({
        name: formData.name,
        description: formData.description || undefined,
        location: formData.location,
        type: formData.type,
        customType: formData.type === 'Autre' ? formData.customType : undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        publishedAt
      });
      toast.success('Événement créé avec succès !');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Link>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <Calendar className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Créer un nouvel événement
              </h1>
              <p className="text-xl text-muted-foreground">
                Organisez un événement pour la communauté IESEG
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <Card className="shadow-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center">
                Informations de l'événement
              </CardTitle>
              <CardDescription className="text-center">
                Remplissez les détails de votre événement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Nom de l'événement *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ex: Soirée d'intégration IESEG"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Décrivez votre événement..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Lieu *
                  </label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="Ex: Campus IESEG Lille"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Type d'événement *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="CB">CB (Crazy Bar)</option>
                    <option value="Mini CB">Mini CB</option>
                    <option value="Afterwork">Afterwork</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                {formData.type === 'Autre' && (
                  <div className="space-y-2">
                    <label htmlFor="customType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Préciser le type d'événement *
                    </label>
                    <Input
                      id="customType"
                      name="customType"
                      type="text"
                      placeholder="Ex: Gala, Conférence, etc."
                      value={formData.customType}
                      onChange={handleChange}
                      required={formData.type === 'Autre'}
                      className="h-11"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="startDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Date de début *
                    </label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="h-11"
                      lang="fr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="endDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Date de fin *
                    </label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className="h-11"
                      lang="fr"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Publication</h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Quand publier cet événement ?
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="now"
                          checked={formData.publishMode === 'now'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Publier immédiatement</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="schedule"
                          checked={formData.publishMode === 'schedule'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Programmer la publication</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="publishMode"
                          value="draft"
                          checked={formData.publishMode === 'draft'}
                          onChange={handleChange}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Sauvegarder comme brouillon</span>
                      </label>
                    </div>
                  </div>

                  {formData.publishMode === 'schedule' && (
                    <div className="space-y-2">
                      <label htmlFor="publishedAt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Date de publication *
                      </label>
                      <Input
                        id="publishedAt"
                        name="publishedAt"
                        type="datetime-local"
                        value={formData.publishedAt}
                        onChange={handleChange}
                        required={formData.publishMode === 'schedule'}
                        className="h-11"
                        min={new Date().toISOString().slice(0, 16)}
                        lang="fr"
                      />
                      <p className="text-xs text-gray-500">
                        L'événement sera visible par les utilisateurs à partir de cette date
                      </p>
                    </div>
                  )}

                  {formData.publishMode === 'draft' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Brouillon :</strong> L'événement ne sera pas visible par les utilisateurs.
                        Vous pourrez le publier plus tard depuis la page d'édition.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg"
                  >
                    {loading ? 'Création en cours...' : 'Créer l\'événement'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}