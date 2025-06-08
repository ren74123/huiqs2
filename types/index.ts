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
  nickname: string;
  avatar: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  banner_type: 'main' | 'enterprise';
}

export interface Destination {
  id: string;
  name: string;
  description: string;
  image_url: string;
}
