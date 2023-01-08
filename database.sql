
CREATE TABLE users(
  uid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(100),
  nickname VARCHAR(30),
  password VARCHAR(100)
);

CREATE UNIQUE INDEX email ON users (email);

CREATE UNIQUE INDEX nickname ON users (nickname);

CREATE TABLE testtab(
  uid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100),
  position VARCHAR(100),
  skills VARCHAR(100),
  comment VARCHAR(100)
);
