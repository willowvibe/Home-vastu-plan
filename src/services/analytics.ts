import plausible, { EventOptions } from 'plausible-tracker';

interface AnalyticsConfig {
  enabled?: boolean;
  domain?: string;
  apiHost?: string;
}

const config: AnalyticsConfig = {
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
  domain: import.meta.env.VITE_ANALYTICS_DOMAIN || 'vastuplan.app',
  apiHost: import.meta.env.VITE_ANALYTICS_API_HOST || 'https://plausible.io',
};

function getTracker() {
  if (!config.enabled) {
    return null;
  }
  return plausible({
    domain: config.domain,
    apiHost: config.apiHost,
  });
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, options?: EventOptions): void {
  if (!config.enabled) {
    console.log(`[Analytics] Event: ${eventName}`, options);
    return;
  }

  const tracker = getTracker();
  if (tracker) {
    tracker.trackEvent(eventName, options);
  }
}

/**
 * Track a page view
 */
export function trackPageView(url?: string): void {
  if (!config.enabled) {
    console.log(`[Analytics] Page view: ${url || window.location.pathname}`);
    return;
  }

  const tracker = getTracker();
  if (tracker) {
    tracker.trackPageview({ url });
  }
}

/**
 * Track a goal conversion
 */
export function trackGoal(goalName: string, options?: EventOptions): void {
  trackEvent(goalName, options);
}

/**
 * Set user properties
 */
export function setProperties(properties: Record<string, unknown>): void {
  if (!config.enabled) {
    console.log('[Analytics] Properties set:', properties);
    return;
  }

  const tracker = getTracker();
  if (tracker) {
    // Plausible tracker doesn't have a direct setProperties method
    // We log this for debugging purposes
    console.log('[Analytics] Properties set:', properties);
  }
}

// Event names for type safety
export const EVENTS = {
  // Plan creation events
  PLAN_CREATED: 'plan_created',
  PLAN_LOADED: 'plan_loaded',
  PLAN_SHARED: 'plan_shared',
  PLAN_EXPORTED: 'plan_exported',

  // Room management events
  ROOM_ADDED: 'room_added',
  ROOM_DELETED: 'room_deleted',
  ROOM_DRAGGED: 'room_dragged',
  ROOM_RESIZED: 'room_resized',
  ROOM_ROTATED: 'room_rotated',
  ROOM_NUDGED: 'room_nudged',
  ROOM_ELEMENT_ADDED: 'room_element_added',
  ROOM_ELEMENT_ROTATED: 'room_element_rotated',

  // Feature events
  AI_ANALYZED: 'ai_analyzed',
  VASTU_GRID_TOGGLED: 'vastu_grid_toggled',
  VASTU_TOUR_TOGGLED: 'vastu_tour_toggled',
  DARK_MODE_TOGGLED: 'dark_mode_toggled',
  UNDO_PERFORMED: 'undo_performed',
  REDO_PERFORMED: 'redo_performed',

  // Export events
  EXPORT_PNG: 'export_png',
  EXPORT_SVG: 'export_svg',
  EXPORT_PDF: 'export_pdf',
  EXPORT_JSON: 'export_json',

  // Auth events
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_UP: 'user_signed_up',

  // Landing page events
  LANDING_SIGNUP_SUBMIT: 'landing_signup_submit',
  LANDING_MAGIC_LINK_SENT: 'landing_magic_link_sent',
  LANDING_GOOGLE_CLICK: 'landing_google_click',

  // UI events
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',
  SEARCH_PERFORMED: 'search_performed',

  // Sharing events
  SHARE_LINK_CREATED: 'share_link_created',
  SHARE_VIEW_MODE: 'share_view_mode',
  SHARE_COMMENT_MODE: 'share_comment_mode',

  // Comment events
  COMMENT_ADDED: 'comment_added',
  COMMENT_DELETED: 'comment_deleted',
  COMMENT_UPDATED: 'comment_updated',

  // Construction overlay events (G-3 / G-4 / G-5)
  STAIRCASE_ADDED: 'staircase_added',
  PLUMBING_OVERLAY_TOGGLED: 'plumbing_overlay_toggled',
  SUN_PATH_TOGGLED: 'sun_path_toggled',
  SUN_PATH_TIME_CHANGED: 'sun_path_time_changed',
};

// Default metadata for events
export const EVENT_METADATA = {
  // Room type metadata
  roomTypes: {
    Bedroom: 'bedroom',
    'Master Bedroom': 'master_bedroom',
    Kitchen: 'kitchen',
    'Living Room': 'living_room',
    Bathroom: 'bathroom',
    Dining: 'dining',
    Balcony: 'balcony',
    Study: 'study',
    Store: 'store',
    Parking: 'parking',
    Stairs: 'stairs',
    'Pooja Room': 'pooja_room',
  } as Record<string, string>,
};
