import './AmbientBackground.css'

// Camadas decorativas do fundo: foco de luz que segue o cursor, orbes com
// desfoque, anéis e estrelas. Tudo é aria-hidden e não recebe cliques.
function AmbientBackground() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="spotlight" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />
      <div className="ring ring-one" />
      <div className="ring ring-two" />
      <div className="stars" />
    </div>
  )
}

export default AmbientBackground
