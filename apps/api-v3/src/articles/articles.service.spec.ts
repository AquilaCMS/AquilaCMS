import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { Article } from './schemas/article.schema';

const articleModelMock = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('ArticlesService', () => {
  let service: ArticlesService;
  let model: jest.Mocked<Model<Article>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getModelToken('Article'),
          useValue: articleModelMock,
        },
      ],
    }).compile();

    service = module.get(ArticlesService);
    model = module.get(getModelToken('Article'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert a new article', async () => {
      const mockedArticle: CreateArticleDto = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      model.create.mockResolvedValueOnce(mockedArticle as any);

      const createArticleDto = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      const result = await service.create(createArticleDto);

      expect(result).toEqual(mockedArticle);
      expect(model.create).toHaveBeenCalledWith(createArticleDto);
    });
  });

  describe('findAll', () => {
    it('should return all articles', async () => {
      const mockedArticles = [
        {
          code: 'Article #1',
          title: 'Title #1',
          coverImage: 'Url #1',
        },
        {
          code: 'Article #2',
          title: 'Title #2',
          coverImage: 'Url #2',
        },
      ];
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedArticles),
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(mockedArticles);
      expect(model.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one article', async () => {
      const mockedArticle = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedArticle),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.findOne(id);

      expect(result).toEqual(mockedArticle);
      expect(model.findOne).toHaveBeenCalledWith({ _id: id });
    });
  });

  describe('update', () => {
    it('should update a article', async () => {
      const mockedArticle = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedArticle),
      } as any);

      const id = new Types.ObjectId().toString();
      const updateArticleDto = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      const result = await service.update(id, updateArticleDto);

      expect(result).toEqual(mockedArticle);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        { _id: id },
        updateArticleDto,
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('should delete a article', async () => {
      const mockedArticle = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      model.findByIdAndDelete.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedArticle),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.remove(id);

      expect(result).toEqual(mockedArticle);
      expect(model.findByIdAndDelete).toHaveBeenCalledWith({ _id: id });
    });
  });
});