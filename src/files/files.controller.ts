import { Controller, Post, Body, UploadedFile, UseInterceptors,} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('products')
  @UseInterceptors( FileInterceptor('file') )
  uploadFile(@UploadedFile() 
    file: Express.Multer.File
  ) {

    

    return file;
  }
  
}
