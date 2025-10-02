import { useState } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'ratings'>('info');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-card shadow rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
        </div>

        {/* Navigation tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Informations personnelles
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'ratings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              Évaluations
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Prénom
                  </label>
                  <div className="text-foreground">{user.firstName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Nom
                  </label>
                  <div className="text-foreground">{user.lastName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email
                  </label>
                  <div className="text-foreground">{user.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Téléphone
                  </label>
                  <div className="text-foreground">{user.phone}</div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-foreground">Fonctionnalité à venir</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les évaluations des événements apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}