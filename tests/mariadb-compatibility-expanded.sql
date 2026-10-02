-- Expanded MariaDB comparison corpus for the currently supported AFJ-DB subset.
DROP DATABASE IF EXISTS afj_expanded;
CREATE DATABASE afj_expanded;
USE afj_expanded;

CREATE TABLE teams(id INT PRIMARY KEY, name VARCHAR(32) NOT NULL);
CREATE TABLE users(
  id INT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  team_id INT,
  active BOOLEAN NOT NULL,
  email VARCHAR(128) UNIQUE,
  CONSTRAINT fk_team FOREIGN KEY(team_id) REFERENCES teams(id),
  CHECK(active = TRUE OR active = FALSE)
);

INSERT INTO teams VALUES (1,'core'),(2,'ops');
INSERT INTO users VALUES
  (1,'Kim',1,TRUE,NULL),
  (2,'Lee',2,TRUE,'lee@example.test'),
  (3,'Park',1,FALSE,NULL);

SELECT id,name FROM users WHERE active=TRUE ORDER BY id DESC;
SELECT * FROM users WHERE email IS NULL;
SELECT * FROM users WHERE email IS NOT NULL;
SELECT t.name, COUNT(u.id) AS n
  FROM teams t LEFT JOIN users u ON t.id=u.team_id
  GROUP BY t.id,t.name ORDER BY t.id;
SELECT COUNT(*) AS remaining FROM users;

ALTER TABLE users ADD COLUMN phone VARCHAR(32);
START TRANSACTION;
UPDATE users SET active=FALSE WHERE id=2;
ROLLBACK;
SELECT id,active FROM users WHERE id=2;
UPDATE users SET active=FALSE WHERE id=1;
DELETE FROM users WHERE id=3;
SELECT COUNT(*) AS remaining FROM users;
DROP TABLE users;
