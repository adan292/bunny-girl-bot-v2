export const FARMER_RANKS = [
  { nivel: 0,   nombre: '🌱 Aprendiz de la Tierra' },
  { nivel: 2,   nombre: '🌿 Recolector Novato' },
  { nivel: 5,   nombre: '🌾 Cultivador Principiante' },
  { nivel: 8,   nombre: '🍀 Granjero Aficionado' },
  { nivel: 12,  nombre: '🏡 Campesino Trabajador' },
  { nivel: 16,  nombre: '🚜 Granjero Experimentado' },
  { nivel: 20,  nombre: '🌻 Especialista en Botánica' },
  { nivel: 25,  nombre: '🍂 Maestro de Otoño' },
  { nivel: 30,  nombre: '❄️ Superviviente de Invierno' },
  { nivel: 35,  nombre: '🌸 Señor de la Primavera' },
  { nivel: 40,  nombre: '☀️ Rey del Verano' },
  { nivel: 45,  nombre: '🌳 Cuidador de Bosques' },
  { nivel: 50,  nombre: '🍄 Erudito de los Hongos' },
  { nivel: 55,  nombre: '🌺 Maestro de las Flores' },
  { nivel: 60,  nombre: '🌴 Magnate Tropical' },
  { nivel: 65,  nombre: '🧪 Alquimista Rural' },
  { nivel: 70,  nombre: '🪄 Granjero Mágico' },
  { nivel: 75,  nombre: '🔮 Maestro de Elixires' },
  { nivel: 80,  nombre: '🌌 Viajero Astral' },
  { nivel: 85,  nombre: '☄️ Granjero Cósmico' },
  { nivel: 90,  nombre: '🐉 Domador de Tierras' },
  { nivel: 95,  nombre: '👑 Leyenda de la Cosecha' },
  { nivel: 100, nombre: '⚕️ Semidiós Agrícola' },
  { nivel: 110, nombre: '✨ Deidad de la Naturaleza' },
  { nivel: 120, nombre: '🛐 Dios Supremo de la Cosecha' }
]

export function calcFarmerLevel(farmerXP = 0) {
  return Math.floor(Math.pow(farmerXP / 100, 0.5)) || 0
}

export function getFarmerRank(farmerLevel = 0) {
  let rango = FARMER_RANKS[0].nombre
  for (const r of FARMER_RANKS) {
    if (farmerLevel >= r.nivel) rango = r.nombre
  }
  return rango
}