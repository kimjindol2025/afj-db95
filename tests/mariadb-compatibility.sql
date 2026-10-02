-- AFJ-DB95 / MariaDB 11.x comparison corpus.
-- Run only against an explicitly isolated test database.
DROP DATABASE IF EXISTS afj_regression;
CREATE DATABASE afj_regression;
USE afj_regression;

CREATE TABLE teams(id INT PRIMARY KEY, name VARCHAR(32) NOT NULL);
CREATE TABLE users(
  id INT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  team_id INT,
  active BOOLEAN NOT NULL,
  UNIQUE KEY uq_name(name),
  CONSTRAINT fk_team FOREIGN KEY(team_id) REFERENCES teams(id)
);

INSERT INTO teams VALUES (1,'core'),(2,'ops');
INSERT INTO users VALUES (1,'Kim',1,TRUE),(2,'Lee',2,TRUE),(3,'Park',1,FALSE);
SELECT id,name FROM users WHERE active=TRUE ORDER BY id DESC;
SELECT t.name, COUNT(u.id) AS n
  FROM teams t LEFT JOIN users u ON t.id=u.team_id
  GROUP BY t.id,t.name ORDER BY t.id;

ALTER TABLE users ADD COLUMN email VARCHAR(128);
START TRANSACTION;
UPDATE users SET active=FALSE WHERE id=1;
ROLLBACK;
SELECT id,active FROM users WHERE id=1;
UPDATE users SET active=FALSE WHERE id=2;
DELETE FROM users WHERE id=3;
SELECT COUNT(*) AS remaining FROM users;
DROP TABLE users;
