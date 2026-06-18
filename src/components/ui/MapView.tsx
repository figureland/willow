import 'maplibre-gl/dist/maplibre-gl.css'

import clsx from 'clsx'
import type { Feature, FeatureCollection, MultiPolygon } from 'geojson'
import type { MapMouseEvent, StyleSpecification } from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Layer,
  type LngLatBoundsLike,
  Map as MapGL,
  type MapRef,
  Marker,
  Source,
} from 'react-map-gl/maplibre'
import {
  type Bbox,
  type PolygonRing,
  ringCentroid,
  ringsToBbox,
  ringToBbox,
} from '../../types'
import { IconList, IconMap, IconMinus, IconPlus } from './icons'
import { SegmentedControl } from './SegmentedControl'

/**
 * Polygon to be rendered on the map. Fields may consist of multiple
 * disjoint parcels, so `rings` is always an array of closed rings; pass a
 * single-element array for a contiguous shape.
 */
export type MapPolygon = {
  id: string
  rings: PolygonRing[]
  /** Optional display name rendered as a label at the polygon centroid. */
  name?: string
}

export type MapBasemap = 'satellite' | 'topographic'

export type MapViewProps = {
  /** Polygons drawn as a fill + outline. */
  polygons: MapPolygon[]
  /** Currently selected polygon ids — rendered with the selection style. */
  selected?: string[]
  onSelectPolygon?: (id: string, event: MapMouseEvent) => void
  /** Basemap defaults to satellite. */
  basemap?: MapBasemap
  defaultBasemap?: MapBasemap
  onBasemapChange?: (next: MapBasemap) => void
  /** Show a Sat/Topo segmented control in the top-right. Defaults to true. */
  showBasemapToggle?: boolean
  /**
   * Show field-name labels at each polygon centroid. Defaults to true; turn
   * off for dense data sets where labels would crowd each other.
   */
  showLabels?: boolean
  /**
   * Zoom level at which labels begin to render. Below this they are hidden
   * to avoid crowding when many polygons are visible at once. Defaults to
   * 14 — a comfortable "field-close" level for the satellite basemap.
   */
  labelMinZoom?: number
  /**
   * Show ± zoom buttons in the bottom-right corner. Defaults to true.
   */
  showZoomControls?: boolean
  /**
   * If provided, the camera fits this bbox on first render. Otherwise the
   * camera fits the union of `polygons`.
   */
  initialBbox?: Bbox | null
  /** Padding (px) used by fitBounds. */
  fitPadding?: number
  className?: string
  /** Height of the map. Defaults to 480px. */
  height?: number | string
  /** Accessible label announced when the map mounts. */
  ariaLabel?: string
}

const BASEMAP_STYLES: Record<MapBasemap, StyleSpecification> = {
  satellite: {
    version: 8,
    sources: {
      'esri-world-imagery': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution:
          'Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers: [
      {
        id: 'esri-world-imagery',
        type: 'raster',
        source: 'esri-world-imagery',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
  topographic: {
    version: 8,
    sources: {
      'esri-world-topo': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Source: Esri, USGS, NOAA',
      },
    },
    layers: [
      {
        id: 'esri-world-topo',
        type: 'raster',
        source: 'esri-world-topo',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
}

const polygonToFeature = (
  polygon: MapPolygon,
  isSelected: boolean,
): Feature<MultiPolygon, { id: string; selected: boolean }> => ({
  type: 'Feature',
  id: polygon.id,
  properties: { id: polygon.id, selected: isSelected },
  geometry: {
    type: 'MultiPolygon',
    // Each ring is its own independent polygon — disjoint parcels rather
    // than a single polygon with holes.
    coordinates: polygon.rings.map((r) => [r]),
  },
})

/** Largest ring by bbox area — used to anchor the label on the dominant parcel. */
const largestRing = (rings: PolygonRing[]): PolygonRing => {
  let best = rings[0]
  let bestArea = 0
  for (const ring of rings) {
    const [w, s, e, n] = ringToBbox(ring)
    const area = (e - w) * (n - s)
    if (area > bestArea) {
      bestArea = area
      best = ring
    }
  }
  return best
}

const bboxToBounds = (bbox: Bbox): LngLatBoundsLike => {
  const [west, south, east, north] = bbox
  return [
    [west, south],
    [east, north],
  ]
}

/**
 * Token-styled MapLibre map. Designed around the eventual ESRI migration:
 * basemaps are ESRI raster tile services already, polygons use a plain
 * GeoJSON source, and the camera + selection state are entirely in props
 * so swapping the renderer means rewriting this file alone.
 */
export const MapView = ({
  polygons,
  selected = [],
  onSelectPolygon,
  basemap,
  defaultBasemap = 'satellite',
  onBasemapChange,
  showBasemapToggle = true,
  showLabels = true,
  labelMinZoom = 14,
  showZoomControls = true,
  initialBbox,
  fitPadding = 32,
  className,
  height = 480,
  ariaLabel = 'Field map',
}: MapViewProps) => {
  const mapRef = useRef<MapRef | null>(null)
  const isControlled = basemap !== undefined
  const [internalBasemap, setInternalBasemap] =
    useState<MapBasemap>(defaultBasemap)
  const activeBasemap = isControlled ? (basemap as MapBasemap) : internalBasemap
  const handleBasemap = (next: MapBasemap) => {
    if (!isControlled) setInternalBasemap(next)
    onBasemapChange?.(next)
  }

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const featureCollection = useMemo<
    FeatureCollection<MultiPolygon, { id: string; selected: boolean }>
  >(
    () => ({
      type: 'FeatureCollection',
      features: polygons.map((p) => polygonToFeature(p, selectedSet.has(p.id))),
    }),
    [polygons, selectedSet],
  )

  const targetBbox = useMemo<Bbox | null>(() => {
    if (initialBbox) return initialBbox
    if (polygons.length === 0) return null
    return ringsToBbox(polygons.flatMap((p) => p.rings))
  }, [initialBbox, polygons])

  // Pre-compute label positions so we don't re-derive every render. Labels
  // are HTML markers (not MapLibre symbol layers) so we get the real
  // Overpass font + design-system colours without hosting SDF glyphs.
  const labels = useMemo(
    () =>
      polygons
        .filter((p) => !!p.name && p.rings.length > 0)
        .map((p) => ({
          id: p.id,
          name: p.name as string,
          centroid: ringCentroid(largestRing(p.rings)),
          selected: selectedSet.has(p.id),
        })),
    [polygons, selectedSet],
  )

  const initialView = useMemo(() => {
    if (targetBbox) {
      const [west, south, east, north] = targetBbox
      return {
        longitude: (west + east) / 2,
        latitude: (south + north) / 2,
        zoom: 12,
      }
    }
    return { longitude: 0, latitude: 51, zoom: 4 }
  }, [targetBbox])

  // Track the current zoom so we can gate label rendering and disable the
  // zoom-in/out buttons at their stops.
  const [zoom, setZoom] = useState(initialView.zoom)

  // Re-fit whenever the polygon set / bbox changes after mount. Also re-fits
  // whenever the container resizes (e.g. the SideSheet finishes its open
  // animation), since fitBounds against a 0-width viewport is a no-op.
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!targetBbox) return
    const container = containerRef.current
    if (!container) return
    const fit = () => {
      const map = mapRef.current
      if (!map) return
      map.resize()
      map.fitBounds(bboxToBounds(targetBbox), {
        padding: fitPadding,
        duration: 600,
        maxZoom: 17,
      })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [targetBbox, fitPadding])

  const handleMouseEnter = useCallback(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'pointer'
  }, [])
  const handleMouseLeave = useCallback(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }, [])

  const handleClick = useCallback(
    (event: MapMouseEvent) => {
      if (!onSelectPolygon) return
      const features = mapRef.current?.queryRenderedFeatures(event.point, {
        layers: ['polygons-fill'],
      })
      const first = features?.[0]
      if (!first) return
      const id = (first.properties as { id?: string } | null)?.id
      if (id) onSelectPolygon(id, event)
    },
    [onSelectPolygon],
  )

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full overflow-hidden rounded-xl border-2 border-border-tertiary bg-bg-secondary',
        className,
      )}
      style={{ height }}
    >
      <MapGL
        ref={(ref) => {
          mapRef.current = ref
        }}
        mapStyle={BASEMAP_STYLES[activeBasemap]}
        initialViewState={initialView}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLoad={(e) => setZoom(e.target.getZoom())}
        onMove={(e) => setZoom(e.viewState.zoom)}
        interactiveLayerIds={['polygons-fill']}
        attributionControl={{ compact: true }}
        aria-label={ariaLabel}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="polygons" type="geojson" data={featureCollection}>
          <Layer
            id="polygons-fill"
            type="fill"
            paint={{
              'fill-color': '#00b82b',
              'fill-opacity': ['case', ['get', 'selected'], 0.7, 0.35],
            }}
          />
          <Layer
            id="polygons-outline"
            type="line"
            paint={{
              'line-color': '#00b82b',
              'line-width': ['case', ['get', 'selected'], 3, 2],
              'line-opacity': 0.95,
            }}
          />
        </Source>

        {showLabels && zoom >= labelMinZoom
          ? labels.map((label) => (
              <Marker
                key={label.id}
                longitude={label.centroid[0]}
                latitude={label.centroid[1]}
                anchor="center"
                style={{ pointerEvents: 'none' }}
              >
                <span
                  className={clsx(
                    'select-none whitespace-nowrap font-sans text-sm font-semibold tracking-[0.25px]',
                    'text-white',
                    // Halo to keep labels legible over busy satellite imagery
                    // (no token for `text-shadow`, so we use a literal black
                    // shadow stack).
                    '[text-shadow:_0_1px_2px_rgba(0,0,0,0.85),_0_0_4px_rgba(0,0,0,0.65)]',
                    label.selected && 'text-md',
                  )}
                >
                  {label.name}
                </span>
              </Marker>
            ))
          : null}
      </MapGL>

      {showBasemapToggle ? (
        <div className="absolute top-3 right-3 z-10">
          <SegmentedControl<MapBasemap>
            ariaLabel="Basemap"
            value={activeBasemap}
            onValueChange={handleBasemap}
            options={[
              {
                value: 'satellite',
                label: 'Satellite',
                leadingIcon: <IconMap />,
              },
              {
                value: 'topographic',
                label: 'Topographic',
                leadingIcon: <IconList />,
              },
            ]}
          />
        </div>
      ) : null}

      {showZoomControls ? (
        <div className="absolute top-3 left-3 z-10 flex flex-col overflow-hidden rounded-md border-2 border-border-secondary bg-bg-primary shadow-sm">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn({ duration: 200 })}
            className="grid size-9 place-items-center text-icon-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            <IconPlus size={20} />
          </button>
          <div aria-hidden="true" className="h-px w-full bg-border-secondary" />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut({ duration: 200 })}
            className="grid size-9 place-items-center text-icon-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            <IconMinus size={20} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
