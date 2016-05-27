package com.mainpart;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.Iterator;
import java.util.Map;

public class AlgesRunner implements ActionListener {
    AlgesGraphics graphParent;
    AlgesEngine engParent;
    AlgesRunner(AlgesGraphics graphParent, AlgesEngine engParent)
    {
        this.graphParent = graphParent;
        this.engParent = engParent;
    }

    int toMove = 0;
    int i = 0;
    boolean ifRes;

    public void screenOutput(int curElement)
    {
        if(engParent.intermCode.get(curElement+1).contains("'"))
            graphParent.consoleOutput.setText(engParent.intermCode.get(curElement + 1));

        else {
            Iterator<Map.Entry<String, String>> iterator = engParent.vars.entrySet().iterator();
            while(iterator.hasNext()) {
                String key = iterator.next().getKey();
                System.out.println("Var name: "+key);
                String toOut = engParent.intermCode.get(curElement+1);
                System.out.println("To Print: "+toOut);
                if(key.equals(toOut)) {
                    graphParent.consoleOutput.setText(engParent.vars.get(key));
                    break;
                }

                else
                    graphParent.consoleOutput.setText("Помилка #2. Змінної, вказаної в блоці виводу, не існує.");
            }
        }
    }

    public boolean operators(int curElement)
    {
        String el1 = engParent.intermCode.get(curElement + 1);
        String symb = engParent.intermCode.get(curElement + 2);
        String el2 = engParent.intermCode.get(curElement + 3);
        int intEl1 = 0;
        int intEl2 = 0;
        boolean isVar = false;
        boolean isTrue = false;
        Iterator<Map.Entry<String, String>> iterator = engParent.vars.entrySet().iterator();
        if(engParent.vars.containsKey(el1)) {
            isVar = true;
            while(iterator.hasNext()) {
                Map.Entry<String, String> pair = iterator.next();
                if(pair.getKey().equals(el1)){
                    intEl1 = Integer.parseInt(pair.getValue());
                    break;
                }
            }
        }

        else
            intEl1 = Integer.parseInt(engParent.intermCode.get(curElement + 1));

        if(engParent.vars.containsKey(el2)) {
            while(iterator.hasNext()) {
                Map.Entry<String, String> pair = iterator.next();
                if(pair.getKey().equals(el2)){
                    intEl2 = Integer.parseInt(pair.getValue());
                    break;
                }
            }
        }

        else
            intEl2 = Integer.parseInt(engParent.intermCode.get(curElement + 3));

        if(symb.equals("+")) {
            intEl1 += intEl2;
            if(isVar) {
                engParent.vars.put(el1, String.valueOf(intEl1));
                isVar = false;
            }
        }

        else if(symb.equals("-")) {
            intEl1 -= intEl2;
            if(isVar) {
                engParent.vars.put(el1, String.valueOf(intEl1));
                isVar = false;
            }
        }

        else if(symb.equals("*")) {
            intEl1 *= intEl2;
            if(isVar) {
                engParent.vars.put(el1, String.valueOf(intEl1));
                isVar = false;
            }
        }

        else if(symb.equals("/")) {
            intEl1 /= intEl2;
            if(isVar) {
                engParent.vars.put(el1, String.valueOf(intEl1));
                isVar = false;
            }
        }

        else if(symb.equals(">")) {
            if (intEl1 > intEl2)
                isTrue = true;
            else isTrue = false;
        }

        else if(symb.equals("<")) {
            if (intEl1 < intEl2)
                isTrue = true;
            else isTrue = false;
        }

        else if(symb.equals("=")) {
            if (intEl1 == intEl2)
                isTrue = true;
            else isTrue = false;
        }

        else if(symb.equals("<=")) {
            if (intEl1 <= intEl2)
                isTrue = true;
            else isTrue = false;
        }

        else if(symb.equals(">=")) {
            if (intEl1 >= intEl2)
                isTrue = true;
            else isTrue = false;
        }

        return isTrue;
    }

    public void conditionIf(int curElement)
    {
        boolean ifResult;
        int thenElement = curElement + 6;
        int elseElement = 0;
        int move = 0;

        if(engParent.intermCode.get(curElement + 1).equals("op"))
        {
            //Перевірка, true/false
            ifResult = operators(curElement + 1);
            System.out.println(ifResult);

            //Блок дій для true
            if(ifResult) {
                //Якщо команда оператора
                if(engParent.intermCode.get(thenElement).equals("op")) {
                    operators(thenElement);
                    elseElement = thenElement + 5;
                }

                else if(engParent.intermCode.get(thenElement).equals("wr")) {
                    screenOutput(thenElement);
                    elseElement = thenElement + 4;
                }

                if(engParent.intermCode.get(elseElement).equals("op"))
                    move = elseElement + 4;

                else if(engParent.intermCode.get(elseElement).equals("wr"))
                    move = elseElement + 2;

                i = move - 1;
            }

            //Блок дій для false
            else if(!ifResult) {
                if(engParent.intermCode.get(thenElement).equals("op"))
                    elseElement = thenElement + 5;
                else if(engParent.intermCode.get(thenElement).equals("wr"))
                    elseElement = thenElement + 3;

                if(engParent.intermCode.get(elseElement).equals("op")) {
                    operators(elseElement);
                    move = elseElement + 4;
                }

                else if(engParent.intermCode.get(elseElement).equals("wr")) {
                    screenOutput(elseElement);
                    move = elseElement + 2;
                }

                i = move - 1;
            }
        }

        else
            graphParent.consoleOutput.setText("Помилка #3. Неправильне задання умови розгалуження.");
    }

    public void actionPerformed(ActionEvent e)
    {
        int size = engParent.intermCode.size();
        System.out.println(size);

        if(e.getSource() == graphParent.runBut)
        {
            //if(engParent.intermCode.get(0) != "algS")
              //  graphParent.consoleOutput.setText("Помилка #0. Блок початку алгоритму відсутній");
            //if(engParent.intermCode.get(engParent.intermCode.size()) != "algE")
              //  graphParent.consoleOutput.setText("Помилка #1. Блок кінця агоритму відсутній");

            try {
                i = 0;
                while(i < engParent.intermCode.size())
                {
                    if(engParent.intermCode.get(i).equals("wr")) {
                        screenOutput(i);
                    }

                    else if(engParent.intermCode.get(i).equals("op")) {
                        operators(i);
                    }

                    else if (engParent.intermCode.get(i).equals("if")) {
                        conditionIf(i);
                    }

                    i++;
                }
            }
            catch (Exception errorMessage) {
                graphParent.consoleOutput.setText(errorMessage.toString());
            }
        }
    }
}
