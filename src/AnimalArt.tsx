export default function AnimalArt({ id, className = '', alt = '' }: { id: string; className?: string; alt?: string }) {
  return <img className={`animal-art ${className}`} src={`art/animals/${id}.webp`} alt={alt} draggable="false" decoding="async" />;
}
