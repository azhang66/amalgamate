DROP DATABASE IF EXISTS `refactored-potato`;
DROP USER IF EXISTS 'refactored-potato'@'localhost';

CREATE DATABASE `refactored-potato`;
USE `refactored-potato`;
CREATE TABLE users (
    student_id INTEGER(6) NOT NULL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE USER 'refactored-potato'@'localhost' IDENTIFIED BY 'secret';
GRANT ALL PRIVILEGES ON `refactored-potato`.* TO 'refactored-potato'@'localhost';
FLUSH PRIVILEGES;
