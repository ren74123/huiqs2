export interface Message {
  id: string;
  fromId: string;
  toId: string;
  senderRole: 'agent' | 'admin';
  content: string;
  read: boolean;
  createdAt: string;
}

export interface TravelPackage {
  id: string;
  title: string;
  description: string;
  content: string;
  images: string[];
  price: number;
  duration: number;
  destination: string;
  agentId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  packageId: string;
  contactInfo: {
    name: string;
    phone: string;
    idCardImageUrl?: string;
  };
  date: string;
  status: 'pending' | 'contacted';
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'user' | 'agent' | 'admin';
}