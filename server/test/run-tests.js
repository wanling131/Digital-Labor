#!/usr/bin/env node

/**
 * 测试运行脚本
 * 用于便捷执行四项功能点的测试
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`执行: ${description}`, colors.bright);
  log(`${'='.repeat(60)}\n`, colors.cyan);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    log(`✓ ${description} 完成`, colors.green);
    return true;
  } catch (error) {
    log(`✗ ${description} 失败`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function checkEnvironment() {
  log('\n检查测试环境...', colors.cyan);
  
  // 检查Node.js版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    log(`✗ Node.js版本过低: ${nodeVersion} (需要 >= 18.0.0)`, colors.red);
    return false;
  }
  log(`✓ Node.js版本: ${nodeVersion}`, colors.green);
  
  // 检查依赖
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log(`✗ 未找到package.json`, colors.red);
    return false;
  }
  log(`✓ 找到package.json`, colors.green);
  
  // 检查测试文件
  const testFiles = [
    'test/features.test.js',
    'test/e2e.test.js',
    'test/generate-report.js'
  ];
  
  let allFilesExist = true;
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      log(`✓ 找到 ${file}`, colors.green);
    } else {
      log(`✗ 未找到 ${file}`, colors.red);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

function showMenu() {
  log('\n========================================', colors.cyan);
  log('  四项功能点测试套件', colors.bright);
  log('========================================', colors.cyan);
  log('\n请选择要执行的测试:', colors.yellow);
  log('  1. 运行API测试（features.test.js）');
  log('  2. 运行E2E测试（e2e.test.js）');
  log('  3. 运行所有测试');
  log('  4. 生成测试报告');
  log('  5. 检查测试环境');
  log('  0. 退出');
  log('========================================\n');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showMenu();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case '1':
    case 'api':
      if (!checkEnvironment()) {
        log('\n环境检查失败，请先解决上述问题', colors.red);
        process.exit(1);
      }
      runCommand('node --test test/features.test.js', 'API测试');
      break;
      
    case '2':
    case 'e2e':
      if (!checkEnvironment()) {
        log('\n环境检查失败，请先解决上述问题', colors.red);
        process.exit(1);
      }
      runCommand('npx playwright test', 'E2E测试');
      break;
      
    case '3':
    case 'all':
      if (!checkEnvironment()) {
        log('\n环境检查失败，请先解决上述问题', colors.red);
        process.exit(1);
      }
      
      log('\n开始运行所有测试...\n', colors.bright);
      
      const apiSuccess = runCommand('node --test test/features.test.js', 'API测试');
      const e2eSuccess = runCommand('npx playwright test', 'E2E测试');
      
      if (apiSuccess && e2eSuccess) {
        log('\n所有测试完成！', colors.green);
        log('生成测试报告...\n', colors.yellow);
        runCommand('node test/generate-report.js', '生成测试报告');
      } else {
        log('\n部分测试失败，请检查错误信息', colors.red);
        process.exit(1);
      }
      break;
      
    case '4':
    case 'report':
      runCommand('node test/generate-report.js', '生成测试报告');
      break;
      
    case '5':
    case 'check':
      checkEnvironment();
      break;
      
    case '0':
    case 'exit':
      log('\n退出测试套件\n', colors.yellow);
      break;
      
    default:
      log(`\n未知命令: ${command}`, colors.red);
      showMenu();
  }
}

main();
