const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { findUserById, findByEmail, createUser, updateUserProfileFunc } = require('../dao/auth/auth.js');
require("dotenv").config();

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try{
         const email = profile.emails?.[0]?.value || "";

         if(!email) {
          return done(new Error("No email found from google"), null);
         }

         let user = await findByEmail(email);

         if(user){
          if(user.auth_provider !== "google" || !user.provider_id) {

            await updateUserProfileFunc(
              {
                auth_provider: "google",
                provider_id: profile.id,
                image: profile.photos?.[0].value || user.image,
              },
              user.id
            );
            console.log("User updated")
          }
          console.log("User login successfull");
          return done(null, user);
         }

         const [first_name, ...lastParts] = profile.displayName.split(" ");
         const last_name = lastParts.join(" ") || "";


         user = await createUser({
           first_name,
           last_name,
           email,
           auth_provider: "google",
           provider_id: profile.id,
           image: profile.photos?.[0]?.value || "",
         });

         return done(null, user);
        }
        catch(err){
          console.error(`Error in passport callback: ${err.message}`);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try{
    const user = await findUserById(id);
    done(null, user);
    }
    catch(err) {
      done(err, null)
    }
  })
}