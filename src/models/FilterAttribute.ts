import mongoose, { Document, Model, Schema } from 'mongoose';

export type FilterType = 'enum' | 'range' | 'boolean';

export interface IFilterAttribute extends Document {
  categoryId: mongoose.Types.ObjectId;
  key: string;
  label: string;
  type: FilterType;
  options?: string[];
  range?: {
    min?: number;
    max?: number;
  };
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FilterAttributeSchema = new Schema<IFilterAttribute>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['enum', 'range', 'boolean'], required: true },
    options: [{ type: String }],
    range: {
      min: { type: Number },
      max: { type: Number },
    },
    unit: { type: String },
  },
  { timestamps: true }
);

FilterAttributeSchema.index({ categoryId: 1, key: 1 }, { unique: true });

FilterAttributeSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const FilterAttribute: Model<IFilterAttribute> =
  mongoose.models.FilterAttribute ||
  mongoose.model<IFilterAttribute>('FilterAttribute', FilterAttributeSchema);
