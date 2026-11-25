-- MySQL dump 10.13  Distrib 8.4.13, for Linux (x86_64)
--
-- Host: localhost    Database: online_courses
-- ------------------------------------------------------
-- Server version	8.4.13-0ubuntu0.26.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Courses`
--

DROP TABLE IF EXISTS `Courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacherId` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `category` enum('Dev','Data','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `courses_teacher_id` (`teacherId`),
  KEY `courses_status` (`status`),
  CONSTRAINT `Courses_ibfk_1` FOREIGN KEY (`teacherId`) REFERENCES `Users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Courses`
--

LOCK TABLES `Courses` WRITE;
/*!40000 ALTER TABLE `Courses` DISABLE KEYS */;
INSERT INTO `Courses` VALUES (1,1,'Cours de test 1','Description du cours de test 1','DRAFT','2026-11-19 11:03:11','2026-11-19 11:03:11','other','23ad5b30-e4e0-11f1-a9c2-dc4ba1136520'),(2,1,'Cours de test 2','Description du cours de test 2','DRAFT','2026-11-19 11:03:11','2026-11-19 11:03:11','other','23ade1b6-e4e0-11f1-a9c2-dc4ba1136520'),(3,1,'Cours de test 3','Description du cours de test 3','DRAFT','2026-11-19 11:03:11','2026-11-19 11:03:11','other','23ae68b1-e4e0-11f1-a9c2-dc4ba1136520'),(4,3,'Cours de test 4','Description du cours de test 4','DRAFT','2026-11-19 13:16:27','2026-11-19 13:16:27','Dev','23aef6ad-e4e0-11f1-a9c2-dc4ba1136520'),(5,3,'Cours de test 5','Description du cours de test 5','DRAFT','2026-11-19 13:16:27','2026-11-19 13:16:27','Data','23af6a18-e4e0-11f1-a9c2-dc4ba1136520'),(6,3,'Cours de test 6','Description du cours de test 6','DRAFT','2026-11-19 13:16:27','2026-11-19 13:16:27','other','23afd3d9-e4e0-11f1-a9c2-dc4ba1136520'),(7,3,'Cours de test 7','Description du cours de test 7','DRAFT','2026-11-19 13:16:52','2026-11-19 13:16:52','Dev','23b0350f-e4e0-11f1-a9c2-dc4ba1136520'),(8,3,'Cours de test 8','Description du cours de test 8','DRAFT','2026-11-19 13:16:52','2026-11-19 13:16:52','Data','23b0a393-e4e0-11f1-a9c2-dc4ba1136520'),(9,3,'Cours de test 9','Description du cours de test 9','DRAFT','2026-11-19 13:16:52','2026-11-19 13:16:52','other','23b11993-e4e0-11f1-a9c2-dc4ba1136520'),(10,3,'Cours de test 10','Description du cours de test 10','DRAFT','2026-11-19 13:17:21','2026-11-19 13:17:21','Dev','23b1820d-e4e0-11f1-a9c2-dc4ba1136520'),(11,3,'Cours de test 11','Description du cours de test 11','DRAFT','2026-11-19 13:17:21','2026-11-19 13:17:21','Data','23b1f421-e4e0-11f1-a9c2-dc4ba1136520'),(12,3,'Cours de test 12','Description du cours de test 12','DRAFT','2026-11-19 13:17:21','2026-11-19 13:17:21','other','23b2b83e-e4e0-11f1-a9c2-dc4ba1136520'),(13,3,'Introduction à Node.js','Apprendre les bases de Node.js','PUBLISHED','2026-11-20 11:24:52','2026-11-20 11:25:27','Dev','23b3296b-e4e0-11f1-a9c2-dc4ba1136520'),(14,3,'Introduction à Express.js','Apprendre les bases de Express.js','PUBLISHED','2026-11-20 11:30:56','2026-11-20 11:32:43','Dev','23b39e05-e4e0-11f1-a9c2-dc4ba1136520'),(15,3,'Introduction à Laravel','Apprendre les bases de Laravel','PUBLISHED','2026-11-20 11:34:44','2026-11-20 11:35:09','Dev','23b3fed0-e4e0-11f1-a9c2-dc4ba1136520'),(16,3,'Cours de Test UUID','Cours dédié aux tests avec identifiants UUID','PUBLISHED','2026-11-20 12:46:10','2026-11-20 12:46:10','Dev','550e8400-e29b-41d4-a716-446655440000');
/*!40000 ALTER TABLE `Courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Enrollments`
--

DROP TABLE IF EXISTS `Enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `courseId` int NOT NULL,
  `learnerId` int NOT NULL,
  `enrolledAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `enrollments_course_learner_unique` (`courseId`,`learnerId`),
  UNIQUE KEY `enrollments_uuid_unique` (`uuid`),
  KEY `enrollments_learner_id` (`learnerId`),
  CONSTRAINT `Enrollments_ibfk_1` FOREIGN KEY (`courseId`) REFERENCES `Courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Enrollments_ibfk_2` FOREIGN KEY (`learnerId`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Enrollments`
--

LOCK TABLES `Enrollments` WRITE;
/*!40000 ALTER TABLE `Enrollments` DISABLE KEYS */;
INSERT INTO `Enrollments` VALUES (1,1,1,'2026-11-18 10:23:30','2026-11-18 10:23:30','2026-11-18 10:23:30','56a05365-d17b-4478-a330-5d01baca33a0'),(2,1,4,'2026-11-18 10:57:33','2026-11-18 10:57:33','2026-11-18 10:57:33','586b5588-c5cf-48ce-91b5-1121c2bfd840'),(3,4,4,'2026-11-19 07:52:52','2026-11-19 07:52:52','2026-11-19 07:52:52','e5377a08-9fba-4bdf-b7a4-42cb7a5e099d'),(4,3,6,'2026-11-19 08:28:20','2026-11-19 08:28:20','2026-11-19 08:28:20','4d7b3ea0-e3d3-4cd9-b1dd-99582504ee4e'),(5,4,6,'2026-11-19 08:29:16','2026-11-19 08:29:16','2026-11-19 08:29:16','6530a8fa-7fd2-4cfc-8a9a-56af4645493a'),(6,13,4,'2026-11-20 11:26:06','2026-11-20 11:26:06','2026-11-20 11:26:06','572da705-5732-4b10-8540-458591e8ef9d'),(7,13,6,'2026-11-20 11:26:06','2026-11-20 11:26:06','2026-11-20 11:26:06','2c2cd423-4a64-408d-8110-b405f7d4c974'),(8,14,4,'2026-11-20 11:32:53','2026-11-20 11:32:53','2026-11-20 11:32:53','d8be76b3-ac3f-4d83-8fdf-12f0e2e75fa9'),(9,14,6,'2026-11-20 11:32:53','2026-11-20 11:32:53','2026-11-20 11:32:53','7e1472ab-8b85-4193-90c3-f8d8a33444ba'),(10,14,7,'2026-11-20 11:44:16','2026-11-20 11:44:16','2026-11-20 11:44:16','018dce0d-7056-4441-8613-aacf3130bd9b'),(11,14,8,'2026-11-20 11:44:16','2026-11-20 11:44:16','2026-11-20 11:44:16','f428d6ee-3932-49da-87f3-cbee0fa051e8'),(12,14,9,'2026-11-20 11:44:16','2026-11-20 11:44:16','2026-11-20 11:44:16','1885809e-f0e0-4c2b-8561-269a5ace17f3'),(13,14,10,'2026-11-20 11:44:16','2026-11-20 11:44:16','2026-11-20 11:44:16','b9d095c3-5247-4728-91e6-8d06480e8029'),(14,14,11,'2026-11-20 11:44:16','2026-11-20 11:44:16','2026-11-20 11:44:16','c69994a3-7dff-4259-9d30-4e8682beaee0'),(15,15,7,'2026-11-20 11:50:26','2026-11-20 11:50:26','2026-11-20 11:50:26','b4f7866a-bd23-4adc-b566-615eb5b462b1'),(16,15,8,'2026-11-20 11:50:26','2026-11-20 11:50:26','2026-11-20 11:50:26','819004a5-dd7f-4be5-a4b0-5dac75e45f18'),(17,15,9,'2026-11-20 11:50:26','2026-11-20 11:50:26','2026-11-20 11:50:26','da04cb17-5459-40cc-95ce-57e1a7397752'),(18,15,10,'2026-11-20 11:50:26','2026-11-20 11:50:26','2026-11-20 11:50:26','294af546-e27c-48d8-8a9c-1e8349d72ef7'),(19,15,11,'2026-11-20 11:50:26','2026-11-20 11:50:26','2026-11-20 11:50:26','6cd128f5-44b4-4d91-91b0-e3b7e117a998');
/*!40000 ALTER TABLE `Enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LessonProgress`
--

DROP TABLE IF EXISTS `LessonProgress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LessonProgress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `lessonId` int NOT NULL,
  `isCompleted` tinyint(1) NOT NULL DEFAULT '0',
  `completedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lesson_progress_enrollment_lesson_unique` (`enrollmentId`,`lessonId`),
  KEY `lesson_progress_lesson_id` (`lessonId`),
  CONSTRAINT `LessonProgress_ibfk_1` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LessonProgress_ibfk_2` FOREIGN KEY (`lessonId`) REFERENCES `Lessons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LessonProgress`
--

LOCK TABLES `LessonProgress` WRITE;
/*!40000 ALTER TABLE `LessonProgress` DISABLE KEYS */;
/*!40000 ALTER TABLE `LessonProgress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Lessons`
--

DROP TABLE IF EXISTS `Lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Lessons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `moduleId` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lessons_uuid_unique` (`uuid`),
  KEY `lessons_module_id` (`moduleId`),
  CONSTRAINT `Lessons_ibfk_1` FOREIGN KEY (`moduleId`) REFERENCES `Modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Lessons`
--

LOCK TABLES `Lessons` WRITE;
/*!40000 ALTER TABLE `Lessons` DISABLE KEYS */;
INSERT INTO `Lessons` VALUES (1,1,'Qu’est-ce que Node.js ?','Node.js est un environnement d’exécution JavaScript basé sur le moteur V8.',1,'2026-11-16 15:31:11','2026-11-16 15:31:11','3abf6977-f3dd-4245-bd29-064111a6a842'),(2,2,'Présentation de Node.js','Node.js est un environnement d\'exécution JavaScript.',1,'2026-11-17 10:06:31','2026-11-17 10:06:31','f2d37b53-3a37-455e-a6d5-a76fc85cd8a1');
/*!40000 ALTER TABLE `Lessons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LoginLogs`
--

DROP TABLE IF EXISTS `LoginLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LoginLogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ipAddress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_unicode_ci,
  `success` tinyint(1) NOT NULL DEFAULT '0',
  `failureReason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `LoginLogs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LoginLogs`
--

LOCK TABLES `LoginLogs` WRITE;
/*!40000 ALTER TABLE `LoginLogs` DISABLE KEYS */;
INSERT INTO `LoginLogs` VALUES (1,1,'mamadou.test@example.com','::1','curl/8.18.0',1,NULL,'2026-11-08 19:30:24','2026-11-08 19:30:24'),(2,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:30:35','2026-11-08 19:30:35'),(3,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(4,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(5,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(6,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(7,1,'mamadou.test@example.com','::1','curl/8.18.0',1,NULL,'2026-11-08 21:29:47','2026-11-08 21:29:47'),(8,3,'aly.niang@example.com','::1','curl/8.18.0',1,NULL,'2026-11-16 14:53:49','2026-11-16 14:53:49'),(9,3,'aly.niang@example.com','::1','curl/8.18.0',1,NULL,'2026-11-16 15:19:02','2026-11-16 15:19:02'),(10,3,'aly.niang@example.com','::1','curl/8.18.0',1,NULL,'2026-11-16 15:41:24','2026-11-16 15:41:24'),(11,3,'aly.niang@example.com','::ffff:127.0.0.1','vscode-restclient',1,NULL,'2026-11-16 16:24:20','2026-11-16 16:24:20'),(12,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 09:06:08','2026-11-17 09:06:08'),(13,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 09:53:33','2026-11-17 09:53:33'),(14,5,'bestie.diallo.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 11:27:59','2026-11-17 11:27:59'),(15,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-17 11:45:10','2026-11-17 11:45:10'),(16,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 11:45:32','2026-11-17 11:45:32'),(17,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 13:23:19','2026-11-17 13:23:19'),(18,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 13:27:19','2026-11-17 13:27:19'),(19,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 13:32:50','2026-11-17 13:32:50'),(20,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-17 13:36:32','2026-11-17 13:36:32'),(21,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 10:10:15','2026-11-18 10:10:15'),(22,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 10:21:55','2026-11-18 10:21:55'),(23,NULL,'bestie.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'USER_NOT_FOUND','2026-11-18 10:34:05','2026-11-18 10:34:05'),(24,NULL,'bestie.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'USER_NOT_FOUND','2026-11-18 10:34:53','2026-11-18 10:34:53'),(25,NULL,'bestie.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'USER_NOT_FOUND','2026-11-18 10:35:07','2026-11-18 10:35:07'),(26,5,'bestie.diallo.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-18 10:35:50','2026-11-18 10:35:50'),(27,5,'bestie.diallo.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-18 10:35:54','2026-11-18 10:35:54'),(28,5,'bestie.diallo.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 10:50:39','2026-11-18 10:50:39'),(29,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 10:54:59','2026-11-18 10:54:59'),(30,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 14:28:44','2026-11-18 14:28:44'),(31,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 14:31:42','2026-11-18 14:31:42'),(32,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',1,NULL,'2026-11-18 14:37:16','2026-11-18 14:37:16'),(33,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 07:52:27','2026-11-19 07:52:27'),(34,1,'mamadou.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-19 08:03:04','2026-11-19 08:03:04'),(35,1,'mamadou.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-19 08:03:15','2026-11-19 08:03:15'),(36,1,'mamadou.test@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',0,'INVALID_PASSWORD','2026-11-19 08:04:54','2026-11-19 08:04:54'),(37,6,'mamadou.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 08:24:53','2026-11-19 08:24:53'),(38,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 08:34:51','2026-11-19 08:34:51'),(39,6,'mamadou.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 09:14:00','2026-11-19 09:14:00'),(40,3,'aly.niang@example.com','::1','curl/8.18.0',1,NULL,'2026-11-19 13:11:29','2026-11-19 13:11:29'),(41,3,'aly.niang@example.com','::1','curl/8.18.0',1,NULL,'2026-11-19 13:11:42','2026-11-19 13:11:42'),(42,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 13:31:17','2026-11-19 13:31:17'),(43,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 13:42:16','2026-11-19 13:42:16'),(44,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-19 14:08:16','2026-11-19 14:08:16'),(45,4,'rose.diallo@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 09:56:00','2026-11-20 09:56:00'),(46,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 10:55:54','2026-11-20 10:55:54'),(47,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 11:15:29','2026-11-20 11:15:29'),(48,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 11:30:13','2026-11-20 11:30:13'),(49,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 11:50:01','2026-11-20 11:50:01'),(50,3,'aly.niang@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 12:00:54','2026-11-20 12:00:54'),(51,2,'mamadou.dieye@example.com','::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',1,NULL,'2026-11-20 12:05:09','2026-11-20 12:05:09'),(52,12,'test-flux3@example.com','::1','curl/8.18.0',1,NULL,'2026-11-20 17:37:54','2026-11-20 17:37:54');
/*!40000 ALTER TABLE `LoginLogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Modules`
--

DROP TABLE IF EXISTS `Modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `courseId` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `position` int NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `modules_course_id` (`courseId`),
  CONSTRAINT `Modules_ibfk_1` FOREIGN KEY (`courseId`) REFERENCES `Courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Modules`
--

LOCK TABLES `Modules` WRITE;
/*!40000 ALTER TABLE `Modules` DISABLE KEYS */;
INSERT INTO `Modules` VALUES (1,1,'Découverte de Node.js','Comprendre Node.js et son fonctionnement',1,'2026-11-16 15:30:33','2026-11-16 15:30:33'),(2,3,'Introduction à TypeScript','Découverte des bases de TypeScript',1,'2026-11-17 10:04:10','2026-11-17 10:04:10');
/*!40000 ALTER TABLE `Modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RefreshTokens`
--

DROP TABLE IF EXISTS `RefreshTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefreshTokens` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` int NOT NULL,
  `tokenHash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime NOT NULL,
  `revokedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tokenHash` (`tokenHash`),
  KEY `userId` (`userId`),
  CONSTRAINT `RefreshTokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RefreshTokens`
--

LOCK TABLES `RefreshTokens` WRITE;
/*!40000 ALTER TABLE `RefreshTokens` DISABLE KEYS */;
INSERT INTO `RefreshTokens` VALUES ('066c2cc2-fce8-4689-acd0-3289b86acccf',3,'c96a8caff7067535fae88539e3bf2e207bd2d40409ca0051728628b59db41b2d','2026-11-25 10:10:15',NULL,'2026-11-18 10:10:15','2026-11-18 10:10:15'),('1166c9ce-df07-4abe-b498-bb063425c13b',1,'3bc68cf0f645a911a75f7ffd54e39727faa08e562b5a1d7baab6917421f3e068','2026-11-15 21:29:47',NULL,'2026-11-08 21:29:47','2026-11-08 21:29:47'),('1f088be1-5317-45ae-a096-58666013fb6d',1,'e3da39b8a21a5a38164ea9fa994dcb344b997807da3de95f8ca84705472861ce','2026-11-15 14:49:14',NULL,'2026-11-08 14:48:29','2026-11-08 14:49:14'),('1fb3376a-d92c-468e-b234-b3e6e2e30d33',3,'4067aac1777abd0bb5a14627fed17d3f4b8d49db53d200c4fe7f2b2054a72b7e','2026-11-24 09:06:08',NULL,'2026-11-17 09:06:08','2026-11-17 09:06:08'),('25852806-62f4-40f4-a04b-83b7b3c1fff9',1,'80fab39f56de8488d62166b15148c0ad1dc81eb8ddd588189214328cb3e7b0df','2026-11-15 17:53:21',NULL,'2026-11-08 17:53:21','2026-11-08 17:53:21'),('33b1d0fd-dd60-4260-8e20-31cbdb8ec674',3,'6df3eb8cbd0dfe5084033020c11b500d5a9a6f7c21e7c6929434d50767a31dfb','2026-11-23 15:19:02',NULL,'2026-11-16 15:19:02','2026-11-16 15:19:02'),('3c866970-a3b7-4732-80b4-74abd6f0fd73',2,'392791b63482c741d6b3bd7c5c1be08a14dd1f3dc4f57024e0ff79d56464a3ec','2026-11-27 12:05:09',NULL,'2026-11-20 12:05:09','2026-11-20 12:05:09'),('3f0bc51a-9762-4d1f-b573-7b307e55ade2',4,'4b15e20be2bf1f67744c812827287d43a9d47a67cfc17b2a13ceefbaab663814','2026-11-24 11:45:32',NULL,'2026-11-17 11:45:32','2026-11-17 11:45:32'),('42337a6b-799a-4377-8c1d-51b80543d5c9',3,'9a52eed6707957f37da6b5644fa9ea1afbbc4eb7eae3c57b3e988ee5885753e4','2026-11-26 13:42:16',NULL,'2026-11-19 13:42:16','2026-11-19 13:42:16'),('50a94d53-dfe2-4992-aa1f-4ec501dff038',1,'65061d29964118e95ac41a57b547ffd91b0309191400965d1c8510afd0d164bf','2026-11-15 18:32:24',NULL,'2026-11-08 18:32:24','2026-11-08 18:32:24'),('59b1f784-d9b9-43d1-ade0-3120125259b0',3,'d0fc9a900bdccda2f0bae4c3d1be7477a4e3b5d5485191ec06448da2a3e5c7f2','2026-11-24 09:53:33',NULL,'2026-11-17 09:53:33','2026-11-17 09:53:33'),('5c93dfbd-c675-4979-9e9c-5c802ff08c54',3,'d042fe01206c13c8e2320b2e5603cee69feb76b3d101cdeff1b91f2c51d8a235','2026-11-27 11:30:13',NULL,'2026-11-20 11:30:13','2026-11-20 11:30:13'),('620972ed-09fb-4a00-887c-d82e5e4c8212',3,'bd8dfe398b94a6421c78e2053b977fbcb7d9949156fae93743b5dfcec544a83f','2026-11-27 11:15:29',NULL,'2026-11-20 11:15:29','2026-11-20 11:15:29'),('6b5c4432-33ab-48eb-b1e2-2d97fab1fef6',3,'ce1652c547549076ad919686ba91fda77ab7761ca970546ae8969895d63055d6','2026-11-25 14:28:44',NULL,'2026-11-18 14:28:44','2026-11-18 14:28:44'),('6efb544e-0449-46a1-b459-ab6c3920c0ca',3,'8c99f57da3fb227f3530ec91b776a9c2460b12aa6a1b6b205a8cae29abeb90d0','2026-11-27 10:55:54',NULL,'2026-11-20 10:55:54','2026-11-20 10:55:54'),('7183682d-4976-4d74-bb7b-21e2c8ae586e',3,'32caf327398ae9bd53da69c9d68a4ed7dd97c29b0347b94d52c13633a41fcf8d','2026-11-23 16:24:20',NULL,'2026-11-16 16:24:20','2026-11-16 16:24:20'),('799846f1-bb52-4283-b1c2-a24543babdcb',4,'9e6f374590d5eb4cfddb591fc6246a150fbba26a0980290cd5db56edfca57a9b','2026-11-26 07:52:27',NULL,'2026-11-19 07:52:27','2026-11-19 07:52:27'),('7bbdeff9-6568-44a2-af0c-2a32c0ebffc5',3,'b90c9a06cf2dd90395779c9dbdcff75a831d31ce8ef08fc44016ac2e34275722','2026-11-27 11:50:01',NULL,'2026-11-20 11:50:01','2026-11-20 11:50:01'),('7d2795d8-7516-475f-a4cf-fad201a01605',3,'f2101b41c39185cf0e9bdae3a04e766a97a0f68a52b1eb38192d37bd264377e9','2026-11-26 08:34:51',NULL,'2026-11-19 08:34:51','2026-11-19 08:34:51'),('7da2a726-d4ba-45cc-b118-bc586083bbf3',3,'02de1a5ef19f9d9506f24aee865de640b733f1783031aeae5a77152b7fa54aa0','2026-11-26 13:31:17',NULL,'2026-11-19 13:31:17','2026-11-19 13:31:17'),('7e9c0ec4-419a-42b8-9463-ae9b62b10def',4,'8ed26e6da8f5974c47dc36376933578574ee7fadefef94db463d8a0d2a15f721','2026-11-27 09:56:00',NULL,'2026-11-20 09:56:00','2026-11-20 09:56:00'),('84f4a200-1c34-4648-9a2e-19f0f4add341',3,'36a59d463b210a02cde40fd9def42c5866e601901ff6233bbba3890a75ece023','2026-11-23 15:41:24',NULL,'2026-11-16 15:41:24','2026-11-16 15:41:24'),('85c11b74-568b-490a-ab3a-4163e95e479e',1,'6bf47e41830d1c7abdfd419176b65aa65d5ebbeee2416097aaaf8c094ae240e0','2026-11-15 17:55:38','2026-11-08 17:57:53','2026-11-08 17:55:38','2026-11-08 17:57:53'),('87d06469-21ed-4fad-827f-3e9064f23936',3,'efce36f1fd3455a9ab4fb641f02c7918fcf0ac9158c60c7ac39b0adafcc4d767','2026-11-25 14:31:42',NULL,'2026-11-18 14:31:42','2026-11-18 14:31:42'),('89261540-332c-4cf7-8c76-7384abb43dc6',3,'b6bac9f518848d3b08a5100550cf798fa989ab2c33a6ccec7cdf1017f70cc3ef','2026-11-25 14:37:16',NULL,'2026-11-18 14:37:16','2026-11-18 14:37:16'),('b5723146-6900-47a3-af44-5d1182442cc2',3,'39ed9ee4f4bdd4b9a4986b86d69d2344dfd15a8d5b398984c063fe1b970370b6','2026-11-25 10:54:59',NULL,'2026-11-18 10:54:59','2026-11-18 10:54:59'),('ba58454d-098e-407e-ac99-8bfb8e8042c5',1,'ba70bd9fa46587d0cebd5a672ce0b26c46dc342acbfeb6a2a99bcb8d09c7dd90','2026-11-15 17:07:56',NULL,'2026-11-08 17:07:56','2026-11-08 17:07:56'),('bf9cfa24-9589-4cb9-b73e-45bd59c46bf5',3,'b86e1966aae8ecd584422c727f9e122e1f044957cba1d6f7cd291bd77af53ddc','2026-11-26 13:11:42',NULL,'2026-11-19 13:11:42','2026-11-19 13:11:42'),('c5892ab1-505a-4f80-851b-a1c01a62dbbd',6,'28d9c8adbbb2a38ea5fa9c55ccbb35cfb6a12e2f2648ef97e8f7e9742aaf5dae','2026-11-26 08:24:53',NULL,'2026-11-19 08:24:53','2026-11-19 08:24:53'),('c9b85933-715d-4f36-aef0-81cf9d91ed61',6,'6a01292ca5faff6cc744403053f79e1a948a4844cc0ec755581ab4f9170fde21','2026-11-26 09:14:00',NULL,'2026-11-19 09:14:00','2026-11-19 09:14:00'),('cafa4c79-35c3-4c77-9255-af67db4f609b',5,'6946c5956c7ada19c250508adb1ddc7368cdf0ee389b31e4c8fa8067f3e6976b','2026-11-25 10:50:39',NULL,'2026-11-18 10:50:39','2026-11-18 10:50:39'),('cc15c9b0-51cf-4b9f-abf2-4cb480922c13',3,'ef73b8f2e4f8d023e0467cf3959a1f05b7753c3ec541a9ebc735a63ef073e779','2026-11-24 13:27:19',NULL,'2026-11-17 13:27:19','2026-11-17 13:27:19'),('cdb8805b-e73a-4ee1-b4ee-e388d071087d',4,'d00dd5802c7af55a7286c682e0630ac8f60ad78d213a8b97595d23eeca4ce5d7','2026-11-24 13:32:50',NULL,'2026-11-17 13:32:50','2026-11-17 13:32:50'),('d0a955ae-5285-4143-a33a-fb7001799b0a',1,'34b0249daabcfbf287dee1aeaf9ce97fa36344e2d1840ab6821bc7e67bef884e','2026-11-15 14:32:24',NULL,'2026-11-08 14:32:24','2026-11-08 14:32:24'),('db7b5921-5b78-47ea-8f2b-f530e5ab8577',3,'0db948012b49d850eb6e93b3e0d2d02807150ba80b98b9e48cca75aade192432','2026-11-26 13:11:29',NULL,'2026-11-19 13:11:29','2026-11-19 13:11:29'),('dc4a8529-553f-4212-8119-45fe0c786d9c',4,'39461b23352ab7bd4b6c5ea0eb948aeb3dc5b06f891845e69f2050f5b55f1d17','2026-11-24 13:23:19',NULL,'2026-11-17 13:23:19','2026-11-17 13:23:19'),('df3ef173-c05f-4abe-b602-1c095302ca86',3,'ab2926d970a01c6857d03ef726339f4e51897326888dcc1bef24420e0acc1f63','2026-11-26 14:08:16',NULL,'2026-11-19 14:08:16','2026-11-19 14:08:16'),('e30a6a55-3bd2-4d0a-93f1-d40663e0eca1',3,'956d295f433eb679a9e877816a55022f96d6d7ad316668faf2b78c58937faabf','2026-11-24 13:36:32',NULL,'2026-11-17 13:36:32','2026-11-17 13:36:32'),('e8428933-49bf-464f-bb9a-ab1c6f128c3e',12,'830f437d150f2b2a34cdbf9802fde5e46e7ca2eb8ebd27fc2878aafeb3a85c30','2026-11-27 17:37:54',NULL,'2026-11-20 17:37:54','2026-11-20 17:37:54'),('e8855d81-5af0-4543-ba27-ad817504e140',3,'185cce47dca919632bdd34d71cb065da67c6cbe30e272931339675317e2247c0','2026-11-25 10:21:55',NULL,'2026-11-18 10:21:55','2026-11-18 10:21:55'),('f13f1e4d-b0ba-4bd1-b242-06b620a51183',3,'1ec99a0d2e7caeb4bf6b30adb6880a877c862096f4188354b06e3ef13ee07323','2026-11-27 12:00:54',NULL,'2026-11-20 12:00:54','2026-11-20 12:00:54'),('f2796267-cb9b-4848-a2f4-53ab8a75dab3',3,'bb6fdb9cd7788d5660088e6809293663e55541632f52405df435028ddd88de80','2026-11-23 14:53:49',NULL,'2026-11-16 14:53:49','2026-11-16 14:53:49'),('f7c7ee0e-0952-4789-a504-0a6e0b56f5ac',1,'07bc7ee1ac0e2a4404935ff513fd6947870a8d14ce95f18ba6f974061afa59f6','2026-11-15 19:30:24',NULL,'2026-11-08 19:30:24','2026-11-08 19:30:24'),('fe89c407-bdee-4e23-b6b2-c1080ceb43ff',5,'6d4f3be0d840ab12bd6fb3831c8336f5df673e6ff80e449fbb3da325997cc215','2026-11-24 11:27:59',NULL,'2026-11-17 11:27:59','2026-11-17 11:27:59');
/*!40000 ALTER TABLE `RefreshTokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SequelizeData`
--

DROP TABLE IF EXISTS `SequelizeData`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeData` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SequelizeData`
--

LOCK TABLES `SequelizeData` WRITE;
/*!40000 ALTER TABLE `SequelizeData` DISABLE KEYS */;
INSERT INTO `SequelizeData` VALUES ('001-demo-users.js');
/*!40000 ALTER TABLE `SequelizeData` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SequelizeMeta`
--

DROP TABLE IF EXISTS `SequelizeMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SequelizeMeta`
--

LOCK TABLES `SequelizeMeta` WRITE;
/*!40000 ALTER TABLE `SequelizeMeta` DISABLE KEYS */;
INSERT INTO `SequelizeMeta` VALUES ('001-create-users.js'),('002-create-refresh-tokens.js'),('003-create-login-logs.js'),('004-create-courses.js'),('005-create-modules.js'),('006-create-lessons.js'),('007-create-enrollments.js'),('008-create-lesson-progress.js'),('009-add-category-to-courses.js'),('010-add-uuid-to-users-and-courses.js'),('011-add-isactive-to-users.js'),('012-add-email-verified-to-users.js'),('013-add-uuid-to-enrollments-and-lessons.js');
/*!40000 ALTER TABLE `SequelizeMeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','TEACHER','LEARNER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LEARNER',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `emailVerified` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'Mamadou','Seck','mamadou.test@example.com','$2b$10$cUR1.FV..veMLW7Zh05USe1Gq/eOFFbyaiakZAETzy6kaPZ2WeGzC','LEARNER','2026-11-07 18:14:12','2026-11-07 18:14:12','23a7d2ef-e4e0-11f1-a9c2-dc4ba1136520',1,0),(2,'Mamadou','Dieye','mamadou.dieye@example.com','$2b$12$pW2.EPrlKiuctkuZ3sc3fOcKyOch3bGVRsjpnjDesWLki7MOllTrO','ADMIN','2026-11-09 14:00:08','2026-11-09 14:00:08','23a8571c-e4e0-11f1-a9c2-dc4ba1136520',1,0),(3,'Aly','Niang','aly.niang@example.com','$2b$12$pW2.EPrlKiuctkuZ3sc3fOcKyOch3bGVRsjpnjDesWLki7MOllTrO','TEACHER','2026-11-09 14:00:08','2026-11-09 14:00:08','23a8e37c-e4e0-11f1-a9c2-dc4ba1136520',1,0),(4,'Rose','Diallo','rose.diallo@example.com','$2b$12$pW2.EPrlKiuctkuZ3sc3fOcKyOch3bGVRsjpnjDesWLki7MOllTrO','LEARNER','2026-11-09 14:00:08','2026-11-09 14:00:08','23a9555f-e4e0-11f1-a9c2-dc4ba1136520',1,0),(5,'Bestie','Diallo','bestie.diallo.test@example.com','$2b$10$ouPP5Rovl1eYjTkvF43Sl.S.jdbseA9vXm5T0oBsZXOfecDa33cqe','TEACHER','2026-11-17 11:17:15','2026-11-18 10:49:49','23a9bd85-e4e0-11f1-a9c2-dc4ba1136520',1,0),(6,'Mamadou','Niang','mamadou.niang@example.com','$2b$10$edejumrpzveDTiEdBRKBSO5r8NTG8A96VXX0MtvE8Sm3swBnW3uoC','LEARNER','2026-11-19 08:14:42','2026-11-19 08:14:42','23aa2497-e4e0-11f1-a9c2-dc4ba1136520',1,0),(7,'Modou','Diop','modou.diop@example.com','$2b$12$UngXlvTZ8rrESTTYeZ5AC.cj7fcFEdL041lr8X0DHhktg8DWNcH06','LEARNER','2026-11-20 11:43:24','2026-11-20 11:43:24','23aa7ef3-e4e0-11f1-a9c2-dc4ba1136520',1,0),(8,'Aissatou','Ndiaye','aissatou.ndiaye@example.com','$2b$12$UngXlvTZ8rrESTTYeZ5AC.cj7fcFEdL041lr8X0DHhktg8DWNcH06','LEARNER','2026-11-20 11:43:24','2026-11-20 11:43:24','23aaf31d-e4e0-11f1-a9c2-dc4ba1136520',1,0),(9,'Cheikh','Fall','cheikh.fall@example.com','$2b$12$UngXlvTZ8rrESTTYeZ5AC.cj7fcFEdL041lr8X0DHhktg8DWNcH06','LEARNER','2026-11-20 11:43:24','2026-11-20 11:43:24','23ab5f83-e4e0-11f1-a9c2-dc4ba1136520',1,0),(10,'Mariama','Sarr','mariama.sarr@example.com','$2b$12$UngXlvTZ8rrESTTYeZ5AC.cj7fcFEdL041lr8X0DHhktg8DWNcH06','LEARNER','2026-11-20 11:43:24','2026-11-20 11:43:24','23abfe1e-e4e0-11f1-a9c2-dc4ba1136520',1,0),(11,'Babacar','Gueye','babacar.gueye@example.com','$2b$12$UngXlvTZ8rrESTTYeZ5AC.cj7fcFEdL041lr8X0DHhktg8DWNcH06','LEARNER','2026-11-20 11:43:24','2026-11-20 11:43:24','23acb4cf-e4e0-11f1-a9c2-dc4ba1136520',1,0),(12,'Test','Flux2','test-flux3@example.com','$2b$10$y1Cor9Hey3CgW2FAnTNOjOD4lb4gL1LoeGt5gkTLvC7umQqsh/pPS','LEARNER','2026-11-20 17:37:53','2026-11-20 17:37:54','de47d009-3e44-40ac-bce6-5296487d65cd',1,1);
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'online_courses'
--

--
-- Dumping routines for database 'online_courses'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-22 21:00:03
