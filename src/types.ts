export type TagStatus = 'Draft' | 'Submitted' | 'Signed' | 'Approved' | 'Rejected' | string;

export interface LaborLine {
  key: string;
  employeeId: string;
  employeeName: string;
  trade: string;
  regular: string;
  overtime: string;
  doubleTime: string;
}

export interface MaterialLine {
  key: string;
  description: string;
  qty: string;
  length: string;
}

export interface ExpenseLine {
  key: string;
  description: string;
  amount: string;
}

export interface EquipmentLine {
  key: string;
  description: string;
  qty: string;
}

export interface Attachment {
  key: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  addedAt: string;
}

export interface Signature {
  approver: string;
  mode: 'in-person' | 'send';
  email: string;
  image: string; // PNG data URL, empty when unsigned
  signedAt: string;
}

export interface Tag {
  /** Server Id for tags that came from the API; a local key for new tags. */
  id: string;
  serverId?: number;
  tagNumber: string;
  status: TagStatus;
  description: string;
  tagDate: string;
  isPremium: boolean;
  jobNo: string;
  jobName: string;
  customerId: string;
  customerName: string;
  pmEmail: string;
  address: string;
  lastModified: string;

  /** Counts reported by the list query; replaced by real line counts once lines load. */
  counts: { labor: number; material: number; equipment: number; expense: number };

  labor: LaborLine[];
  materials: MaterialLine[];
  expenses: ExpenseLine[];
  equipment: EquipmentLine[];
  linesLoaded: boolean;

  attachments: Attachment[];
  issues: string[];
  signature: Signature;

  /** True when this device holds changes not yet sent to the server. */
  dirty: boolean;
}

export const emptySignature = (): Signature => ({
  approver: '',
  mode: 'in-person',
  email: '',
  image: '',
  signedAt: '',
});
