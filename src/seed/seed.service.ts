import { Injectable } from '@nestjs/common';
import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {

  constructor(
    private readonly productService : ProductsService,
  ) {}

  async runSeed() {

    await this.insertNewProduct();

    return 'seed executed!';
  }

  private async insertNewProduct() {

    await this.productService.deleteAllProducts(); // delete all products

    const products = initialData.products;

    const insertPromise = [];

    products.forEach(product => {
      insertPromise.push(this.productService.create(product));
    });

    await Promise.all(insertPromise);
    

    return true;
  }
}
