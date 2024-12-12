import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ArticleDocument = HydratedDocument<Article>;

@Schema()
export class Article {
  @Prop()
  code: string;

  @Prop()
  title: string;

  @Prop()
  coverImage: string;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
