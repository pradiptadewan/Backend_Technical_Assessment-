import mongoose, { Model, Schema } from 'mongoose';

export type ListingStatus = 'available' | 'sold' | 'pending' | 'removed';
export type ListingCondition = 'new' | 'used' | 'certified';
export type TransmissionType = 'manual' | 'automatic' | 'cvt' | 'other';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'other';

export interface IListingAttribute {
  key: string;
  type: 'enum' | 'range' | 'boolean';
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
}

export interface IListing {
  sellerId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  condition: ListingCondition;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  color?: string;
  images: string[];
  location: {
    city?: string;
    province?: string;
    country?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  status: ListingStatus;
  isRemoved: boolean;
  attributes: IListingAttribute[];
  createdAt: Date;
  updatedAt: Date;
}

const ListingAttributeSchema = new Schema<IListingAttribute>(
  {
    key: { type: String, required: true },
    type: { type: String, enum: ['enum', 'range', 'boolean'], required: true },
    valueString: { type: String },
    valueNumber: { type: Number },
    valueBoolean: { type: Boolean },
  },
  { _id: false }
);

const ListingSchema = new Schema<IListing>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String },
    make: { type: String, required: true, index: true },
    model: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    mileage: { type: Number, required: true, index: true },
    price: { type: Number, required: true, index: true },
    condition: { type: String, enum: ['new', 'used', 'certified'], required: true, index: true },
    transmission: { type: String, enum: ['manual', 'automatic', 'cvt', 'other'], index: true },
    fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'other'], index: true },
    color: { type: String, index: true },
    images: [{ type: String }],
    location: {
      city: { type: String, index: true },
      province: { type: String },
      country: { type: String },
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    status: { type: String, enum: ['available', 'sold', 'pending', 'removed'], default: 'available', index: true },
    isRemoved: { type: Boolean, default: false, index: true },
    attributes: [ListingAttributeSchema],
  },
  { timestamps: true }
);

ListingSchema.index({ title: 'text', description: 'text', make: 'text', model: 'text', 'location.city': 'text' });
ListingSchema.index({ categoryId: 1, status: 1, isRemoved: 1, createdAt: -1 });
ListingSchema.index({ price: 1, year: 1, mileage: 1 });
ListingSchema.index({ 'attributes.key': 1, 'attributes.valueString': 1 });
ListingSchema.index({ 'attributes.key': 1, 'attributes.valueNumber': 1 });
ListingSchema.index({ 'attributes.key': 1, 'attributes.valueBoolean': 1 });

ListingSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>('Listing', ListingSchema);
