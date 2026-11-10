/** Logo : pastille de la couleur de l'appli, avec son pictogramme (meme logo que sur l'Accueil). */
export function AccessMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} className="shrink-0" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#C2255C"/><g transform="translate(4.56 4.56) scale(.62)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></g></svg>
  );
}
