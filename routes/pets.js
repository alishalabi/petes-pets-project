// MODELS
const Pet = require('../models/pet');

// Uploading to AWS S3
const multer = require('multer');
const upload = multer({ dest: 'uploads/'});
const Upload = require('s3-uploader');

const client = new Upload(process.env.S3_BUCKET, {
  aws: {
    path: 'pets/avatar',
    region: process.env.S3_REGION,
    acl: 'public-read',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  cleanup: {
    versions: true,
    original: true
  },
  versions: [{
    maxWidth: 400,
    aspect: '16:10',
    suffix: '-standard'
  },{
    maxWidth: 300,
    aspect: '1:1',
    suffix: '-square'
  }]
})

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.EMAIL_DOMAIN
  }
}

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

// PET ROUTES
module.exports = (app) => {

  // INDEX PET => index.js

  // NEW PET
  app.get('/pets/new', (req, res) => {
    res.render('pets-new');
  });

  // CREATE PET
  app.post('/pets', upload.single('avatar'), (req, res, next) => {
    const pet = new Pet(req.body);
    pet.save(function (err) {
      if (req.file) {
        client.upload(req.file.path, {}, function (err, versions, meta) {
          if (err) { return res.status(400).send({ err: err }) };

          versions.forEach(function (image) {
            var urlArray = image.url.split('-');
            urlArray.pop();
            // urlArray[0] = urlArray[0] + "-us-west-1";
            var url = urlArray.join('-');
            pet.avatarUrl = url;
            pet.save();
          });

          res.send({ pet: pet });
        });
      } else {
        res.send({ pet: pet });
      }
    })
  })

  // SHOW PET
  app.get('/pets/:id', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-show', { pet: pet });
    });
  });

  // EDIT PET
  app.get('/pets/:id/edit', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-edit', { pet: pet });
    });
  });

  // UPDATE PET
  app.put('/pets/:id', (req, res) => {
    Pet.findByIdAndUpdate(req.params.id, req.body)
      .then((pet) => {
        res.redirect(`/pets/${pet._id}`)
      })
      .catch((err) => {
        // Handle Errors
      });
  });

  // DELETE PET
  app.delete('/pets/:id', (req, res) => {
    Pet.findByIdAndRemove(req.params.id).exec((err, pet) => {
      return res.redirect('/')
    });
  });


  // HTTP: Get One Pet (Based on Search)
  app.get('/search', function (req, res) {
    Pet
        .find(
            { $text : { $search : req.query.term } },
            { score : { $meta: "textScore" } }
        )
        .sort({ score : { $meta : 'textScore' } })
        .limit(20)
        .exec(function(err, pets) {
          if (err) { return res.status(400).send(err) }

          if (req.header('Content-Type') == 'application/json') {
            return res.json({ pets: pets });
          } else {
            return res.render('pets-index', { pets: pets, term: req.query.term });
          }
        });
  });

  // HTTP: Load One Pet's Payment Page
  app.post('/pets/:id/purchase', (req, res) => {
    console.log(req.body);
    // Set your secret key: remember to change this to your live secret key in production
    // See your keys here: https://dashboard.stripe.com/account/apikeys
    const stripe = require("stripe")(process.env.PRIVATE_STRIPE_API_KEY)
    // Token is created using Checkout or Elements!
    // Get the payment token ID submitted by the form:
    const token = req.body.stripeToken; // Using Express

    // req.body.petId can become null through seeding,
    // this way we'll insure we use a non-null value
    let petId = req.body.petId || req.params.id;

    Pet.findById(petId).exec((err, pet) => {
      if(err) {
        console.log('Error: ' + err);
        res.redirect(`/pets/${req.params.id}`);
      }
      const charge = stripe.charges.create({
        amount: pet.price * 100,
        currency: 'usd',
        description: `Purchased ${pet.name}, ${pet.species}`,
        source: token,
      }).then((chg) => {
      // Convert the amount back to dollars for ease in displaying in the template
        const user = {
          email: req.body.stripeEmail,
          amount: chg.amount / 100,
          petName: pet.name
        };
        // After we get the pet so we can grab it's name, then we send the email
        nodemailerMailgun.sendMail({
          from: 'no-reply@example.com',
          to: user.email, // An array if you have multiple recipients.
          subject: 'Pet Purchased!',
          template: {
            name: 'email.handlebars',
            engine: 'handlebars',
            context: user
          }
        }).then(info => {
          console.log('Response: ' + info);
          res.redirect(`/pets/${req.params.id}`);
        }).catch(err => {
          console.log('Error: ' + err);
          res.redirect(`/pets/${req.params.id}`);
        });
      })
      .catch(err => {
        console.log('Error: ' + err);
      });
    })
  });


  // API ROUTES
  // API: Create One Pet
  app.post('/api/pets', upload.single('avatar'), (req, res, next) => {
    const pet = new Pet(req.body);
    pet.save(function (err) {
      if (req.file) {
        client.upload(req.file.path, {}, function (err, versions, meta) {
          if (err) { return res.status(400).send({ err: err }) };

          versions.forEach(function (image) {
            var urlArray = image.url.split('-');
            urlArray.pop();
            // urlArray[0] = urlArray[0] + "-us-west-1";
            var url = urlArray.join('-');
            pet.avatarUrl = url;
            pet.save();
          });

          res.json({ pet: pet });
        });
      } else {
        res.json({ pet: pet });
      }
    })
  })

  // API: SHOW PET
  app.get('/api/pets/:id', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      return res.json('pets-show', { pet: pet });
    });
  });

  // API: UPDATE PET
  app.put('/api/pets/:id', (req, res) => {
    Pet.findByIdAndUpdate(req.params.id, req.body)
      .then((pet) => {
        res.json(`/pets/${pet._id}`)
      })
      .catch((err) => {
        // Handle Errors
      });
  });

  // API: DELETE PET
  app.delete('/api/pets/:id', (req, res) => {
    Pet.findByIdAndRemove(req.params.id).exec((err, pet) => {
      return res.redirect('/')
    });
  });



}
