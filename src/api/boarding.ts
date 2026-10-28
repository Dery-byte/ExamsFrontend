import client from './client';

/** Boarding: hostels / blocks / floors / rooms and who lives where (/api/boarding). */
const root = () => client.defaults.baseURL!.replace('/v1/auth', '') + '/boarding';

/** Set by the developer: DAY (no boarding), BOARDING (everyone boards) or BOTH. */
export type ResidencyMode = 'DAY' | 'BOARDING' | 'BOTH';
export type Residency = 'DAY' | 'BOARDING';
export type Gender = 'MALE' | 'FEMALE';
export type HostelGender = 'BOYS' | 'GIRLS' | 'MIXED';
export type RoomStatus = 'OPEN' | 'CLOSED';
export type EndReason = 'MOVED' | 'SWAPPED' | 'BECAME_DAY' | 'DEACTIVATED' | 'VACATED' | 'NEW_YEAR';

export interface BoardingSettings {
  mode: ResidencyMode; modeLabel: string; word: string; plural: string; customWord: string | null;
  groundFloor: boolean; showRoommates: boolean;
  /** Print the house (or day / boarding) on report cards. */
  showOnReport: boolean;
  /** Schools: auto-allocation keeps classmates in the same rooms, or mixes classes (the Super Admin decides). */
  classmates: 'TOGETHER' | 'MIXED';
}

/** Where a student sleeps; {@code path} is "House › Block › Floor › Room › Bed" (floor only for storey buildings). */
export interface Place {
  hostelId: number; hostel: string; blockId: number | null; block: string | null; floor: number; floorLabel: string | null;
  roomId: number; room: string; bed: number | null; path: string[]; short: string; allocationId?: number; since?: string;
}

export interface StudentBrief {
  id: number; name: string; username: string; photo: string | null; gender: Gender | null; level: number | null;
  programme: string | null; programId: number | null; enabled: boolean;
}

export interface StaffBrief { id: number; userId: number; name: string; title: string | null; duty: 'HEAD' | 'HOUSE' }

export interface HostelCard {
  id: number; name: string; code: string | null; gender: HostelGender; floors: number; allowedLevels: string | null; note: string | null;
  active: boolean; blocks: number; rooms: number; closedRooms: number; beds: number; occupied: number; free: number;
  canManage: boolean; staff: StaffBrief[];
}

export interface Overview {
  settings: BoardingSettings; head: boolean; hostels: HostelCard[];
  boarders?: number; housed?: number; awaiting?: number; noGender?: number;
}

export interface Occupant extends StudentBrief { allocationId: number; bed: number | null; since: string; note: string | null }

export interface Room {
  id: number; blockId: number | null; floor: number; name: string; display: string; capacity: number;
  gender: HostelGender | null; effectiveGender: HostelGender; status: RoomStatus; label: string | null;
  allowedLevels: string | null; effectiveLevels: string | null; free: number; occupants: Occupant[];
}

export interface Block { id: number; name: string; floors: number; gender: HostelGender | null; floorLabels: string[] }

export interface HostelDetail {
  id: number; name: string; code: string | null; gender: HostelGender; floors: number; allowedLevels: string | null; note: string | null;
  active: boolean; canManage: boolean; canEdit: boolean; blockList: Block[]; floorLabels: string[]; rooms: Room[];
  staff: StaffBrief[]; settings: BoardingSettings;
}

export interface StudentRow extends StudentBrief {
  residency: Residency | null; place: Place | null; canManage: boolean;
  /** With a room chosen: why they can't have it (null = they can). */
  fit?: string | null; needsBoarder?: boolean;
}

export interface HistoryRow {
  id: number; student: StudentBrief; place: Place; startedAt: string; assignedBy: string | null; session: string | null;
  endedAt: string | null; endReason: EndReason | null; endedBy: string | null; note: string | null; current: boolean;
}

export interface Awaiting {
  total: number; matching: number; students: StudentBrief[]; levels: number[]; programmes: { id: number; name: string }[];
}

export interface StaffRow extends StaffBrief {
  hostelId: number | null; hostel: string | null; role: string; username: string; photo: string | null; addedBy: string | null; addedAt: string | null;
}

export interface MyRoom {
  mode: ResidencyMode; word: string; residency: Residency | null; place?: Place | null; capacity?: number; roomLabel?: string | null;
  roommates?: { name: string; photo: string | null; level: number | null; programme: string | null; bed: number | null }[];
  staff?: { name: string; title: string | null }[];
}

export interface HostelInput { name: string; code?: string | null; gender: HostelGender; floors: number; allowedLevels?: string | null; note?: string | null }
export interface BlockInput { name: string; floors: number; gender?: HostelGender | null }
export interface RoomInput {
  blockId: number | null; floor: number; name: string; capacity: number; gender?: HostelGender | null; status?: RoomStatus;
  label?: string | null; allowedLevels?: string | null;
}
export interface GenerateInput {
  blockId: number | null; floor: number; prefix: string; from: number; to: number; pad: boolean; capacity: number;
  gender?: HostelGender | null; label?: string | null;
}

// ── Student ────────────────────────────────────────────────────────────────
export const getMyRoom = (): Promise<MyRoom> => client.get(`${root()}/student/me`).then(r => r.data);

// ── Staff ──────────────────────────────────────────────────────────────────
const m = () => `${root()}/manage`;

export const getBoardingOverview = (archived = false): Promise<Overview> =>
  client.get(`${m()}/overview`, { params: { archived } }).then(r => r.data);
export const getHostel = (id: number): Promise<HostelDetail> => client.get(`${m()}/hostels/${id}`).then(r => r.data);
export const addHostel = (d: HostelInput) => client.post(`${m()}/hostels`, d).then(r => r.data);
export const updateHostel = (id: number, d: HostelInput) => client.put(`${m()}/hostels/${id}`, d).then(r => r.data);
export const deleteHostel = (id: number): Promise<{ archived: boolean; message: string }> => client.delete(`${m()}/hostels/${id}`).then(r => r.data);
export const restoreHostel = (id: number) => client.post(`${m()}/hostels/${id}/restore`).then(r => r.data);

export const addBlock = (hostelId: number, d: BlockInput) => client.post(`${m()}/hostels/${hostelId}/blocks`, d).then(r => r.data);
export const updateBlock = (id: number, d: BlockInput) => client.put(`${m()}/blocks/${id}`, d).then(r => r.data);
export const deleteBlock = (id: number): Promise<{ archived: boolean; message: string }> => client.delete(`${m()}/blocks/${id}`).then(r => r.data);

export const addRoom = (hostelId: number, d: RoomInput): Promise<Room> => client.post(`${m()}/hostels/${hostelId}/rooms`, d).then(r => r.data);
export const generateRooms = (hostelId: number, d: GenerateInput): Promise<{ created: string[]; skipped: string[]; message: string }> =>
  client.post(`${m()}/hostels/${hostelId}/rooms/generate`, d).then(r => r.data);
export const updateRoom = (id: number, d: RoomInput): Promise<Room> => client.put(`${m()}/rooms/${id}`, d).then(r => r.data);
export const deleteRoom = (id: number): Promise<{ archived: boolean; message: string }> => client.delete(`${m()}/rooms/${id}`).then(r => r.data);
export const getRoomHistory = (id: number): Promise<HistoryRow[]> => client.get(`${m()}/rooms/${id}/history`).then(r => r.data);

export const findStudents = (q: string, roomId?: number): Promise<StudentRow[]> =>
  client.get(`${m()}/find`, { params: { q, roomId } }).then(r => r.data);
export const getAwaiting = (p: { gender?: string; level?: number; programId?: number; q?: string }): Promise<Awaiting> =>
  client.get(`${m()}/awaiting`, { params: p }).then(r => r.data);
export const getStudentBoarding = (id: number): Promise<StudentRow & { history: HistoryRow[] }> =>
  client.get(`${m()}/students/${id}`).then(r => r.data);
export const updateStudentBoarding = (id: number, d: { gender?: string; residency?: string }): Promise<StudentRow> =>
  client.put(`${m()}/students/${id}`, d).then(r => r.data);

export const assignRoom = (d: { studentId: number; roomId: number; bed?: number | null; makeBoarder?: boolean; note?: string | null }): Promise<Place> =>
  client.post(`${m()}/allocations`, d).then(r => r.data);
export const moveStudent = (allocationId: number, d: { roomId: number; bed?: number | null; note?: string | null }): Promise<Place> =>
  client.post(`${m()}/allocations/${allocationId}/move`, d).then(r => r.data);
export const swapStudents = (firstAllocationId: number, secondAllocationId: number) =>
  client.post(`${m()}/allocations/swap`, { firstAllocationId, secondAllocationId }).then(r => r.data);
export const vacateRoom = (allocationId: number, note?: string): Promise<{ message: string }> =>
  client.post(`${m()}/allocations/${allocationId}/vacate`, { note: note || null }).then(r => r.data);

export const getBoardingStaff = (): Promise<StaffRow[]> => client.get(`${m()}/staff`).then(r => r.data);
export const findStaffCandidates = (q: string): Promise<{ id: number; name: string; username: string; role: string; department: string | null }[]> =>
  client.get(`${m()}/staff/candidates`, { params: { q } }).then(r => r.data);
export const addBoardingStaff = (d: { userId: number; duty: 'HEAD' | 'HOUSE'; hostelId?: number | null; title?: string | null }): Promise<StaffRow[]> =>
  client.post(`${m()}/staff`, d).then(r => r.data);
export const removeBoardingStaff = (id: number): Promise<StaffRow[]> => client.delete(`${m()}/staff/${id}`).then(r => r.data);

export const getBoardingSettings = (): Promise<BoardingSettings> => client.get(`${root()}/settings`).then(r => r.data);
export const saveBoardingSettings = (d: { word?: string; groundFloor?: boolean; showRoommates?: boolean; showOnReport?: boolean; classmates?: 'TOGETHER' | 'MIXED' }): Promise<BoardingSettings> =>
  client.put(`${root()}/settings`, d).then(r => r.data);

// ── Many students at once (each is checked / previewed before it is run) ───

export type BoardingImportType = 'allocations' | 'rooms';
export interface ImportResult {
  type: BoardingImportType; committed: boolean; total: number; valid: number; created: number;
  rows: { row: number; summary: string; ok: boolean; errors: string[] }[];
}
export const checkBoardingImport = (type: BoardingImportType, rows: Record<string, string>[]): Promise<ImportResult> =>
  client.post(`${m()}/import/${type}/check`, { rows }).then(r => r.data);
export const runBoardingImport = (type: BoardingImportType, rows: Record<string, string>[]): Promise<ImportResult> =>
  client.post(`${m()}/import/${type}`, { rows }).then(r => r.data);

/** order: FILL rooms one by one or SPREAD evenly; arrange: ANY, SAME_LEVEL, MIX_LEVELS, MIX_PROGRAMMES. */
export interface AutoRequest {
  hostelIds: number[]; gender: '' | 'MALE' | 'FEMALE' | 'NONE'; levels: number[]; programIds: number[];
  order: 'FILL' | 'SPREAD'; arrange: 'ANY' | 'SAME_LEVEL' | 'MIX_LEVELS' | 'MIX_PROGRAMMES'; numberBeds: boolean;
}
export interface AutoResult {
  committed: boolean; students: number; placed: (StudentBrief & { place: Place })[];
  unplaced: (StudentBrief & { reason: string })[]; perHouse: { house: string; count: number }[];
  freeBedsLeft: number; message: string | null;
}
export const previewAutoAllocate = (d: AutoRequest): Promise<AutoResult> => client.post(`${m()}/auto-allocate/preview`, d).then(r => r.data);
export const runAutoAllocate = (d: AutoRequest): Promise<AutoResult> => client.post(`${m()}/auto-allocate`, d).then(r => r.data);

export interface ClearRequest { hostelId?: number | null; level?: number | null; programId?: number | null; note?: string | null }
export interface ClearResult { committed: boolean; count: number; perHouse: { house: string; count: number }[]; message: string | null }
export const previewClearRooms = (d: ClearRequest): Promise<ClearResult> => client.post(`${m()}/clear/preview`, d).then(r => r.data);
export const clearRooms = (d: ClearRequest): Promise<ClearResult> => client.post(`${m()}/clear`, d).then(r => r.data);
