import './Brand.css'

function Brand() {
  return (
    <header className="brand" aria-label="PersonalControl">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 17.5 9.2 12l3.6 3.2L20 7.5" />
          <path d="M14.8 7.5H20v5.2" />
        </svg>
      </span>
      <span>
        personal<span className="brand-highlight">control</span>
      </span>
    </header>
  )
}

export default Brand
