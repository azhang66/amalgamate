DROP DATABASE IF EXISTS `refactored-potato`;
DROP USER IF EXISTS 'refactored-potato'@'localhost';

CREATE DATABASE `refactored-potato`;
USE `refactored-potato`;
CREATE TABLE users (
    student_id INTEGER(6) NOT NULL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    class_period INTEGER(1) NOT NULL,
    date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE USER 'refactored-potato'@'localhost' IDENTIFIED BY 'secret';
GRANT ALL PRIVILEGES ON *.* TO 'refactored-potato'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;

SELECT 'If there are no errors, proceed to ensure the \'mkpasswd\' command exists and that the username format is correct.' AS 'INFO';
