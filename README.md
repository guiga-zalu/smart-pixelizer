# Smart Pixelizer

## Rapid Aknowledgements

+ It's lossy
+ It's (very) generic
+ Supports modifications and parametrizations
+ It's irreversible (with conventional means; with AIs, it's pseudo reversible)
+ And I don't know if the iterated application gives the same result, or an even bigger loss (probably, a even bigger loss)

### Simplified steps

First, the image is splitten into blocks.  
Then, it gets how much the lightness variates in each region.  
So, each block is resized into a smaller size, losing (not so important) information.  
Finally, then are resized back and joined into the final image!

## Conceptual steps

+ Starts with a function that, given a block in a image, generates a "detail density map" in the block's region: I used a derivative convolutive filter ([Laplace or Sobel](https://docs.gimp.org/2.6/en/plug-in-convmatrix.html#idm273571659376)) over the gamma / lightness value of each pixel.  
  `detail density(img: image, vertical blocks: number, horizontal blocks: number): number[][]`  
  `detail density map := split(img).map(detail density)`
+ The image is splitten into blocks, either by the size of each block, either by columns and rows: in this case, square blocks of 64 pixels each side. If there's a remaining group of pixels, they're divided into blocks with the due size.  
  `split(img: image, vertical blocks: number, horizontal blocks: number): block[][]`
+ Based in the "detail density map" and a mapper function (square root of x, x squared, sen of pi x over 2 ...), new dimensions are defined for these blocks (they are resized). What is lost in here, is lost forever; the function that generates the "detail density map" already _said_ it wasn't important. The blocks are then resized again, now to their original sizes, with [Jimp](https://npmjs.com/package/jimp/)'s nearest neighbour option. This gives that blocky appearance.  
  Some thing like: `{ width, height } = block; block = resize(resize(block, width * detail density, height * detail density), width, height)`
+ All blocks are joined together, into a new image.

## Language:

To processed each frame / image with `JavaScript` (it's where my algorithm lies, still messy).

## Naming

While into the code (and repository) I call the function set by `SmartPixelizer`, I think of naming the project `BAD_PNG`, but am myself still incapable of inventing my own `PNG` format variation.

## AI Powering

No _AI powering_ is done in these tests. There was not a _substancial_ need of an "AI powered region importance detector" as, _per design_, the more the importance of a region, the bigger its "detail density".

_AI powering_ could be used in two phasis:

1. Into the detail density map generator. But the detail density map already gives good results with simply a Laplace filter plus some mapping function (x squared, square root of x etc.).
1. In recreating the original image, as a simple "smoothing of the blockyness" wouldn't give, in the pixel scale, comparable results.

## Other Aknowledgements

### Q&A

#### So, it seeks bright pixels?

No, it seeks _pixel regions_ where there are _brighness variation_. But that's just one `detail density` function. Others can be built (like one which also seeks color variation).

#### How's the (average) compression rate?

In the tests done, the compression rate in videos was insatisfactory.

But with images, testing with JPEG images and then re-encoding the results as PNGs, gave a max compression rate of 95% (or 5% of the original file size). The average is around 60%, at least (tests need to be re done, as changes were made).

#### _Container? Bitrate?_

This is, for now, a *image* compression algorithm, not video nor audio.  
For said images, I plan on doing a PNG format variation, or creating PNGs with chunks a normal interpreter would simply ignore.  
About videos, taking into consideration consistency with the final result, before there is a tridimensional version (image × time), there still holds no meaning in realizing it.

#### Cool! But what should it be used for?

CCTV, security footages: as images tend to repeat, or images with low importance appear in a high frequency (what matter in these images, is what is different).  
Low quality streaming: where there is only low speed internet available.  
Image and video processing: as certaing things (like small details) are not important.  
Photo storage: Google itself already tested recing photo quality of G. Photos stored ones, and, only in the client, where the photo is received in low quality, that a AI model highers its quality. [lacks reference] But I didn't follow its results.

### Other tests

There were done tests using videos, with not so usefull results.  
Until a new codec is built expecifically for this kind of compression, there is no guaranteed gain in video compression.

## How do I use it?

1. Have NodeJS.
1. Have NPM.
1. Clone this repo (or download as a zip).
1. In the unpacked folder, install Jimp: run `npm i` / `npm install`.
1. Create a new `.js` file, with something like:
   ```javascript
   const SmartPixelizer = require(`./${path_to_smart_pixelizer_file}/smart-pixelizer.js`)
   
   var result = await SmartPixelizer.pixelize(
      jimp_image_or_path_or_url,
      {
          // Either block size or cols and rows. Not both.
          /**
           * The size of each block. Just one number means a square.
           * @type { number | number[] }
           */
          blockSize: 64,
          /**
           * The division of the image, in blocks.
           * @type { number }
           */
          cols: 16, rows: 9,
          /**
           * Between 0 and 1 (1 is less blocky).
           * @type { number }
           */
          times: 0.75,
          /**
           * Which detail density function to use.
           * @type { SmartPixelizer.PROCESS_LAPLACE | SmartPixelizer.PROCESS_SOBEL }
           */
          process: SmartPixelizer.PROCESS_LAPLACE,
          /**
           * Which compressing function to use.
           * @type { SmartPixelizer.COMPRESS_RESIZE | SmartPixelizer.COMPRESS_STABLE_RESIZE | SmartPixelizer.COMPRESS_JPEG }
           */
          compress: SmartPixelizer.COMPRESS_RESIZE,
          /**
           * If compression is COMPRESS_STABLE_RESIZE, the sub-blocks won't be of free sizes.
           * This is the ratio size between fixed sub-blocks sizes.
           * @type { number }
           */
          stabilitySize: 2,
          /**
           * Maps [0; 1] to [0; 1]
           * @type { (x: number) => number }
           */
          densityMap: x => x
      }
   );
   await result.writeAsync(resulting_path);
   ```
