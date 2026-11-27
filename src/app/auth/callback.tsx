import { Redirect } from 'expo-router';

// Cible du lien de retour OAuth : la session est gérée par `signInWithGoogle`,
// cette route évite juste l'écran « page introuvable » et renvoie à l'accueil.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
