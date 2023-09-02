import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

import { ProductImage } from "./product-image.entity";
import { User } from "../../auth/entities/user.entity";
@Entity({
  name: "products",
})
export class Product {
  @ApiProperty({
    example: "003ec1dd-871e-4710-a221-5df130b03fdf",
    description: "Product ID",
    uniqueItems: true,
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "T-Shirt Teslo",
    description: "Product Title",
    uniqueItems: true,
  })
  @Column("text", {
    unique: true,
  })
  title: string;

  @ApiProperty({
    example: 100,
    description: "Product Price",
    default: 0,
  })
  @Column("float", {
    default: 0,
  })
  price: number;

  @ApiProperty({
    example: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    description: "Product Description",
  })
  @Column({
    type: "text",
    nullable: true,
  })
  description: string;

  @ApiProperty({
    example: "t_shirt_teslo",
    description: "Product Slug",
    uniqueItems: true,
  })
  @Column("text", {
    unique: true,
  })
  slug: string;

  @ApiProperty({
    example: 10,
    description: "Product Stock",
    default: 0,
  })
  @Column("int", {
    default: 0,
  })
  stock: number;

  @ApiProperty({
    example: ["S", "M", "L", "XL"],
    description: "Product Sizes",
  })
  @Column("text", {
    array: true,
  })
  sizes: string[];

  @ApiProperty({
    example: "women",
    description: "Product Gender",
  })
  @Column("text")
  gender: string;

  @ApiProperty({
    example: ["t-shirt", "teslo"],
    description: "Product Tags",
  })
  @Column("text", {
    array: true,
    default: [],
  })
  tags: string[];

  @ApiProperty({
    example: ["1.jpg", "2.jpg", "3.jpg"],
    description: "Product Images",
  })
  @OneToMany(() => ProductImage, (productImage) => productImage.product, {
    cascade: true,
    eager: true,
  })
  images?: ProductImage[];

  @ManyToOne(() => User, (user) => user.product, {
    eager: true,
  })
  user: User;

  @BeforeInsert()
  checkSlugInsert() {
    if (!this.slug) {
      this.slug = this.title;
    }
    this.slug = this.slug
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("'", "_");
  }

  @BeforeUpdate()
  checkSlugUpdate() {
    this.slug = this.slug
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("'", "_");
  }
}
