import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';

const articlesServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let service: jest.Mocked<ArticlesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: ArticlesService,
          useValue: articlesServiceMock,
        },
      ],
    }).compile();

    controller = module.get(ArticlesController);
    service = module.get(ArticlesService);
  });

  describe('create', () => {
    it('should create a new article', async () => {
      const mockedArticle = {
        _id: new Types.ObjectId(),
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      service.create.mockResolvedValueOnce(mockedArticle);

      const createArticleDto: CreateArticleDto = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      const result = await controller.create(createArticleDto);

      expect(result).toEqual(mockedArticle);
      expect(service.create).toHaveBeenCalledWith(createArticleDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of articles', async () => {
      const mockedArticles = [
        {
          _id: new Types.ObjectId(),
          code: 'Article #1',
          title: 'Title #1',
          coverImage: 'Url #1',
        },
        {
          _id: new Types.ObjectId(),
          code: 'Article #2',
          title: 'Title #2',
          coverImage: 'Url #2',
        },
        {
          _id: new Types.ObjectId(),
          code: 'Article #3',
          title: 'Title #3',
          coverImage: 'Url #3',
        },
      ];
      service.findAll.mockResolvedValueOnce(mockedArticles);

      const result = await controller.findAll();

      expect(result).toEqual(mockedArticles);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single article', async () => {
      const mockedArticle = {
        _id: new Types.ObjectId(),
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      service.findOne.mockResolvedValueOnce(mockedArticle);

      const id = new Types.ObjectId().toString();
      const result = await controller.findOne(id);

      expect(result).toEqual(mockedArticle);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a single article', async () => {
      const mockedArticle = {
        _id: new Types.ObjectId(),
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      service.update.mockResolvedValueOnce(mockedArticle);

      const id = new Types.ObjectId().toString();
      const updateArticleDto: CreateArticleDto = {
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      const result = await controller.update(id, updateArticleDto);

      expect(result).toEqual(mockedArticle);
      expect(service.update).toHaveBeenCalledWith(id, updateArticleDto);
    });
  });

  describe('remove', () => {
    it('should remove a single article', async () => {
      const mockedArticle = {
        _id: new Types.ObjectId(),
        code: 'Article #1',
        title: 'Title #1',
        coverImage: 'Url #1',
      };
      service.remove.mockResolvedValueOnce(mockedArticle);

      const id = new Types.ObjectId().toString();
      const result = await controller.remove(id);

      expect(result).toEqual(mockedArticle);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
