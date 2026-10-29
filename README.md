# Access

Crée une application web de gestion de fournisseurs pour un dessinateur-projeteur en façade. L'interface doit être moderne, épurée (style Shadcn/ui) et simple d'utilisation.

Composants principaux requis :

1. Une base de données / Tableau des fournisseurs avec les champs suivants :

   - Nom du fournisseur

   - Domaine (ex: Aluminium, Vitrage, Ancrages, Panneaux, Étanchéité)

   - Site web principal (lien cliquable)

   - Site web CAO / BIM (lien cliquable, optionnel)

   - Contact (Nom, Email, Téléphone)

   - Notes / Remarques (Zone de texte libre)

2. Fonctionnalités de l'annuaire :

   - Un formulaire clair pour ajouter / modifier / supprimer un fournisseur.

   - Une barre de recherche globale (par nom ou domaine).

   - Un système de filtrage par "Domaine".

Design : Utilise un thème sombre et pro, adapté à un environnement de bureau d'études.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/630d67fe-d11c-4a74-b7ea-d18460c3e49a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
