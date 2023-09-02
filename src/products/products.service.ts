import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { validate as isUUID } from "uuid";

import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "../common/dtos/pagination.dto";
import { ProductImage, Product } from "./entities";
import { User } from "../auth/entities/user.entity";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger("ProductsService");

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    const { images = [], ...productDetails } = createProductDto;

    try {
      const product = this.productRepository.create({
        ...productDetails,
        user,
        images: images.map((img) =>
          this.productImageRepository.create({ url: img })
        ),
      });
      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    return products.map(({ images, ...rest }) => ({
      ...rest,
      images: images.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder("prod");
      product = await queryBuilder
        .where("UPPER(title) =:title or slug =:slug", {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect("prod.images", "prodImages")
        .getOne();
    }
    if (!product)
      throw new NotFoundException(`Product  with ${term} not found`);

    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return { ...rest, images: images.map((img) => img.url) };
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...rest } = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...rest,
    });

    if (!product) throw new NotFoundException(`Product ${id} not found`);

    //Create Query Runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map((img) =>
          this.productImageRepository.create({ url: img })
        );
      }

      product.user = user;

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.productRepository.findOneBy({ id });
    await this.productRepository.remove(product);
  }

  private handleDBExceptions(error: any) {
    if (error.code === "23505")
      throw new InternalServerErrorException("Product already exists");

    this.logger.error(error);
    throw new InternalServerErrorException(
      "Error creating product, check logs"
    );
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder("product");

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
