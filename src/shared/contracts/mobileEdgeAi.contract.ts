/**
 * mobileEdgeAi.contract.ts
 *
 * Contrato tipado para Mobile Edge AI e Offline-First (Eixo 9).
 * Briefings pré-visita em cache, inteligência offline, geofencing consentido
 * e expurgo seguro em logout.
 */

export interface VisitBriefingCache {
  briefingId: string;
  organizationId: string;
  dealId: string;
  companyName: string;
  targetContactName: string;
  targetContactRole: string;
  meetingObjective: string;
  keyOpportunities: string[];
  knownObjections: string[];
  revOpsRisks: string[];
  recommendedTalkingPoints: string[];
  cachedAt: string;
  expiresAt: string;
  isStale: boolean;
}

export interface GeofenceRule {
  geofenceId: string;
  organizationId: string;
  companyName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
  autoRecordingProhibited: true;
  consentRequired: true;
  registeredAt: string;
}

export interface GeofenceEvent {
  eventId: string;
  geofenceId?: string;
  organizationId: string;
  sellerId: string;
  companyName?: string;
  eventType: 'SUGGEST_BRIEFING' | 'PROXIMITY_ALERT' | 'ENTERED_RADIUS' | string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
  timestamp: string;
  autoRecordingTriggered?: false;
  suggestedAction?: string;
  recordingTriggered?: boolean;
}

export interface OfflineAiTask {
  taskId: string;
  organizationId: string;
  sellerId: string;
  taskType: 'NOTE_ENRICHMENT' | 'AUDIO_TRANSCRIPTION_QUEUE' | 'OBJECTION_LOG';
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'QUEUED';
  createdAt: string;
  processedAt?: string;
}

export interface PreVisitBriefing {
  id: string;
  organizationId: string;
  leadId: string;
  companyName: string;
  contactName: string;
  contactRole: string;
  dealObjective: string;
  dealStage: string;
  estimatedValue: number;
  dealSummary: string;
  knownObjections: string[];
  revOpsRisks: string[];
  recommendedPitch: string;
  cachedAt: string;
  isStale: boolean;
}

export interface GeofenceCoordinate {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface GeofenceVisitCheckResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  suggestedAction: 'SHOW_BRIEFING' | 'NONE';
  autoRecordingTriggered: false;
  briefingId?: string;
}

export interface OfflineMeetingNotePayload {
  organizationId: string;
  sellerId: string;
  leadId: string;
  meetingDate: string;
  noteText: string;
  consentGranted: boolean;
  consentMethod?: 'VERBAL_DISCLOSED' | 'WRITTEN_AGREED';
  audioSnippetBase64?: string;
  createdOfflineTimestamp: number;
}

export interface IMobileEdgeAiPort {
  cacheVisitBriefing?(params: {
    organizationId: string;
    dealId: string;
    briefing: Omit<VisitBriefingCache, 'briefingId' | 'cachedAt' | 'expiresAt' | 'isStale'>;
  }): Promise<VisitBriefingCache>;

  getVisitBriefing?(params: {
    organizationId: string;
    dealId: string;
    offlineMode?: boolean;
  }): Promise<VisitBriefingCache | null>;

  registerGeofence?(params: {
    organizationId: string;
    rule: {
      companyName: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
      active?: boolean;
    };
  }): Promise<GeofenceRule>;

  evaluateProximityAndSuggestBriefing?(params: {
    organizationId: string;
    sellerId: string;
    currentCoords: { latitude: number; longitude: number };
    consentOptIn: boolean;
  }): Promise<GeofenceEvent | null>;

  processGeofenceLocation?(params: {
    organizationId: string;
    sellerId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    consentOptIn: boolean;
  }): Promise<GeofenceEvent | null>;

  queueOfflineTask?(params: {
    organizationId: string;
    sellerId: string;
    taskType: OfflineAiTask['taskType'];
    payload: any;
  }): Promise<OfflineAiTask>;

  enqueueOfflineTask?(params: {
    organizationId: string;
    sellerId: string;
    taskType: OfflineAiTask['taskType'];
    payload: any;
  }): Promise<OfflineAiTask>;

  syncPendingOfflineTasks?(
    organizationId: string,
  ): Promise<{ syncedCount: number; errors: string[] }>;

  clear?(): void;

  cachePreVisitBriefing?(briefing: PreVisitBriefing): Promise<void>;
  getOfflineBriefing?(organizationId: string, leadId: string): Promise<PreVisitBriefing | null>;
  evaluateGeofenceProximity?(params: {
    organizationId: string;
    currentLocation: { latitude: number; longitude: number };
    targetGeofence: GeofenceCoordinate;
    leadId: string;
    consentActive: boolean;
  }): Promise<GeofenceVisitCheckResult>;
  queueOfflineMeetingNote?(
    note: OfflineMeetingNotePayload,
  ): Promise<{ queueItemId: string; status: 'QUEUED_LOCALLY' }>;
  purgeLocalCacheOnLogout?(
    organizationId: string,
    sellerId: string,
  ): Promise<{ purgedCount: number; memoryFreed: boolean }>;
}
