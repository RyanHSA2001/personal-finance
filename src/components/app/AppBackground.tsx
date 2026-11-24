import './AppBackground.css'

// Fundo do aplicativo: auroras em movimento, malha sutil e foco de luz que segue o cursor.
// Fica fixo atrás do conteúdo e não recebe cliques.
function AppBackground() {
  return (
    <div className="app-background" aria-hidden="true">
      <div className="app-aurora app-aurora-one" />
      <div className="app-aurora app-aurora-two" />
      <div className="app-aurora app-aurora-three" />
      <div className="app-mesh" />
      <div className="app-spotlight" />
      <div className="app-noise" />
    </div>
  )
}

export default AppBackground
