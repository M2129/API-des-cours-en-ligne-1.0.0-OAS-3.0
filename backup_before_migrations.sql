-- MySQL dump 10.13  Distrib 8.4.11, for Linux (x86_64)
--
-- Host: localhost    Database: online_courses
-- ------------------------------------------------------
-- Server version	8.4.11-0ubuntu0.26.04.1

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LoginLogs`
--

LOCK TABLES `LoginLogs` WRITE;
/*!40000 ALTER TABLE `LoginLogs` DISABLE KEYS */;
INSERT INTO `LoginLogs` VALUES (1,1,'mamadou.test@example.com','::1','curl/8.18.0',1,NULL,'2026-11-08 19:30:24','2026-11-08 19:30:24'),(2,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:30:35','2026-11-08 19:30:35'),(3,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(4,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(5,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(6,1,'mamadou.test@example.com','::1','curl/8.18.0',0,'INVALID_PASSWORD','2026-11-08 19:31:40','2026-11-08 19:31:40'),(7,1,'mamadou.test@example.com','::1','curl/8.18.0',1,NULL,'2026-11-08 21:29:47','2026-11-08 21:29:47');
/*!40000 ALTER TABLE `LoginLogs` ENABLE KEYS */;
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
INSERT INTO `RefreshTokens` VALUES ('1166c9ce-df07-4abe-b498-bb063425c13b',1,'3bc68cf0f645a911a75f7ffd54e39727faa08e562b5a1d7baab6917421f3e068','2026-11-15 21:29:47',NULL,'2026-11-08 21:29:47','2026-11-08 21:29:47'),('1f088be1-5317-45ae-a096-58666013fb6d',1,'e3da39b8a21a5a38164ea9fa994dcb344b997807da3de95f8ca84705472861ce','2026-11-15 14:49:14',NULL,'2026-11-08 14:48:29','2026-11-08 14:49:14'),('25852806-62f4-40f4-a04b-83b7b3c1fff9',1,'80fab39f56de8488d62166b15148c0ad1dc81eb8ddd588189214328cb3e7b0df','2026-11-15 17:53:21',NULL,'2026-11-08 17:53:21','2026-11-08 17:53:21'),('50a94d53-dfe2-4992-aa1f-4ec501dff038',1,'65061d29964118e95ac41a57b547ffd91b0309191400965d1c8510afd0d164bf','2026-11-15 18:32:24',NULL,'2026-11-08 18:32:24','2026-11-08 18:32:24'),('85c11b74-568b-490a-ab3a-4163e95e479e',1,'6bf47e41830d1c7abdfd419176b65aa65d5ebbeee2416097aaaf8c094ae240e0','2026-11-15 17:55:38','2026-11-08 17:57:53','2026-11-08 17:55:38','2026-11-08 17:57:53'),('ba58454d-098e-407e-ac99-8bfb8e8042c5',1,'ba70bd9fa46587d0cebd5a672ce0b26c46dc342acbfeb6a2a99bcb8d09c7dd90','2026-11-15 17:07:56',NULL,'2026-11-08 17:07:56','2026-11-08 17:07:56'),('d0a955ae-5285-4143-a33a-fb7001799b0a',1,'34b0249daabcfbf287dee1aeaf9ce97fa36344e2d1840ab6821bc7e67bef884e','2026-11-15 14:32:24',NULL,'2026-11-08 14:32:24','2026-11-08 14:32:24'),('f7c7ee0e-0952-4789-a504-0a6e0b56f5ac',1,'07bc7ee1ac0e2a4404935ff513fd6947870a8d14ce95f18ba6f974061afa59f6','2026-11-15 19:30:24',NULL,'2026-11-08 19:30:24','2026-11-08 19:30:24');
/*!40000 ALTER TABLE `RefreshTokens` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'Mamadou','Seck','mamadou.test@example.com','$2b$10$cUR1.FV..veMLW7Zh05USe1Gq/eOFFbyaiakZAETzy6kaPZ2WeGzC','LEARNER','2026-11-07 18:14:12','2026-11-07 18:14:12');
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-09 10:52:52
