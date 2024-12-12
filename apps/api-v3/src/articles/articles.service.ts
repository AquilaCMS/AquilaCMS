import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './schemas/article.schema';

@Injectable()
export class ArticlesService {
  constructor(@InjectModel(Article.name) private readonly articleModel: Model<Article>) {}

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    const createdArticle = await this.articleModel.create(createArticleDto);
    return createdArticle;
  }

  async findAll(): Promise<Article[]> {
    return this.articleModel.find().exec();
  }

  async findOne(id: string): Promise<Article | null> {
    return this.articleModel.findOne({ _id: id }).exec();
  }

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article | null> {
    return this.articleModel
      .findByIdAndUpdate({ _id: id }, updateArticleDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Article | null> {
    const deletedArticle = await this.articleModel
      .findByIdAndDelete({ _id: id })
      .exec();
    return deletedArticle;
  }
}
