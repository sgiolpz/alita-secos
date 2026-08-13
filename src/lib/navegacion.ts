/**
 * El menú, en un solo lugar.
 *
 * Agregar una sección nueva es agregar una línea al grupo que le corresponda:
 * ni la barra lateral ni el cajón de móvil necesitan tocarse.
 *
 * Los grupos no son decorativos, separan dos formas distintas de usar la app:
 * lo que se abre durante el turno, con las manos ocupadas, y lo que se
 * configura cada tanto. Mientras esa distinción se respete, el menú puede
 * crecer sin volverse una lista larga que hay que leer entera.
 */

export interface EnlaceMenu {
  /** Nombre de la ruta: con esto se marca la sección abierta. */
  nombre: string
  ruta: string
  texto: string
  soloAdmin?: boolean
}

export interface GrupoMenu {
  titulo: string
  enlaces: EnlaceMenu[]
}

export const MENU: GrupoMenu[] = [
  {
    titulo: 'Día a día',
    enlaces: [
      { nombre: 'ventas', ruta: '/', texto: 'Ventas' },
      { nombre: 'inventario', ruta: '/inventario', texto: 'Inventario' },
      { nombre: 'recaudacion', ruta: '/recaudacion', texto: 'Recaudación' },
    ],
  },
  {
    titulo: 'Configuración',
    enlaces: [
      { nombre: 'productos', ruta: '/productos', texto: 'Productos' },
      {
        nombre: 'administracion',
        ruta: '/administracion',
        texto: 'Administración',
        soloAdmin: true,
      },
    ],
  },
]

/**
 * El menú que le toca a quien está mirando. Un grupo que se queda sin enlaces
 * desaparece, para que nadie vea un título con nada debajo.
 */
export function menuPara(esAdministrador: boolean): GrupoMenu[] {
  return MENU.map((grupo) => ({
    ...grupo,
    enlaces: grupo.enlaces.filter((enlace) => !enlace.soloAdmin || esAdministrador),
  })).filter((grupo) => grupo.enlaces.length > 0)
}
