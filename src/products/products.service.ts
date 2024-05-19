import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';

@Injectable()
export class ProductsService {
  //manejo de errores con el log de nestjs
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSources: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const producto = this.productRepository.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });

      await this.productRepository.save(producto);

      return { ...producto, images };
    } catch (error) {
      this.handleDBException(error);
    }
  }

  //TODO: Implementar paginación
  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    return products.map((product) => ({
      ...product,
      images: product.images.map((image) => image.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();

      // product = await this.productRepository.findOneBy({ slug: term });
    }

    if (!product) throw new NotFoundException(`Product with ${term} not found`);

    return product;
  }

  async findOnePlaint(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    
    const {images, ...toUpdate} = updateProductDto;
    
    
    const product = await this.productRepository.preload({
      id,
      ...toUpdate,
    });

    if (!product) throw new NotFoundException(`Product with id ${id} not found`);

    //Create query runner 
    const queryRunner = this.dataSources.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();


    try {

      if ( images ) {
        //Delete all images
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        //Create new images
        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );


      } 

      await queryRunner.manager.save( product );

      await queryRunner.commitTransaction();
      await queryRunner.release();

      //await this.productRepository.save( product );

      return this.findOnePlaint( id );
    } catch (error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBException(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    await this.productRepository.remove(product);

    return;
  }

  private handleDBException(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(`Error creating product: ${error.message}`);
    throw new InternalServerErrorException('Error creating product');
  }

  //unicamente para la creacion de la semilla de la BD
  async deleteAllProducts() {
    const queryBuiilder = this.productRepository.createQueryBuilder('prod');

    try {
      await queryBuiilder
      .delete()
      .where({})
      .execute();



    } catch (error) {
      
      this.handleDBException(error);

    }
  }
}
